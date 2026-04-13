#!/usr/bin/env python3
"""Email triage CLI.

Fetches unread email from Outlook/Exchange via Microsoft Graph, runs each
message through Claude for triage (priority + summary + action items + draft),
writes a markdown report, and optionally saves reviewable drafts in Outlook.

Usage:
    python triage.py                      # triage + markdown report
    python triage.py --drafts             # also save draft replies to Outlook Drafts
    python triage.py --max 50             # process up to 50 unread
    python triage.py --min-priority high  # only save drafts for high+ priority
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from claude_triage import Triager, TriageResult
from graph_auth import get_access_token
from graph_client import EmailMessage, GraphClient

PRIORITY_ORDER = {"urgent": 0, "high": 1, "normal": 2, "low": 3, "skip": 4}
PRIORITY_EMOJI = {
    "urgent": "[!]",
    "high": "[^]",
    "normal": "[ ]",
    "low": "[.]",
    "skip": "[x]",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Triage unread Outlook email with Claude.")
    p.add_argument(
        "--max",
        type=int,
        default=int(os.environ.get("MAX_EMAILS", "25")),
        help="Max number of unread messages to process (default: 25)",
    )
    p.add_argument(
        "--folder",
        default=os.environ.get("INBOX_FOLDER", "Inbox"),
        help="Mail folder to triage (default: Inbox)",
    )
    p.add_argument(
        "--drafts",
        action="store_true",
        help="Save generated replies as drafts in Outlook (never sent).",
    )
    p.add_argument(
        "--min-priority",
        choices=["urgent", "high", "normal", "low"],
        default="normal",
        help="When --drafts is set, only save drafts for emails at this priority or above.",
    )
    p.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Write markdown report to this path (default: reports/triage_<timestamp>.md).",
    )
    return p.parse_args()


def triage_one(
    triager: Triager, email: EmailMessage
) -> tuple[EmailMessage, TriageResult | None, str | None]:
    """Returns (email, result, error). If triage fails, result is None and error is populated."""
    try:
        result = triager.triage(email)
        return email, result, None
    except Exception as e:  # pragma: no cover — safety net for per-email failures
        return email, None, f"{type(e).__name__}: {e}"


def render_report(
    items: list[tuple[EmailMessage, TriageResult | None, str | None]],
) -> str:
    # Sort urgent → high → normal → low → skip; failed triage goes last.
    def sort_key(item):
        _, result, err = item
        if err or result is None:
            return (99, "")
        return (PRIORITY_ORDER[result.priority], "")

    items = sorted(items, key=sort_key)

    lines: list[str] = []
    lines.append(f"# Email Triage — {datetime.now():%Y-%m-%d %H:%M}")
    lines.append("")
    lines.append(f"Processed **{len(items)}** unread messages.")
    lines.append("")

    # Action items roll-up at the top
    all_actions: list[tuple[str, str, str]] = []  # (priority, sender, action)
    for email, result, err in items:
        if result is None:
            continue
        for a in result.action_items:
            all_actions.append((result.priority, email.sender_name or email.sender_email, a))

    if all_actions:
        lines.append("## To-Do")
        lines.append("")
        for priority, sender, action in all_actions:
            tag = PRIORITY_EMOJI[priority]
            lines.append(f"- {tag} **{sender}** — {action}")
        lines.append("")

    lines.append("## Messages")
    lines.append("")

    for email, result, err in items:
        if err or result is None:
            lines.append(f"### [!!] triage failed — {email.subject}")
            lines.append("")
            lines.append(f"From: {email.sender_name} <{email.sender_email}>  ")
            lines.append(f"Error: `{err}`")
            lines.append("")
            continue
        tag = PRIORITY_EMOJI[result.priority]
        lines.append(f"### {tag} {result.priority.upper()} — {email.subject}")
        lines.append("")
        lines.append(
            f"From: {email.sender_name} <{email.sender_email}>  "
            f"· Received: {email.received}  "
            f"· [Open in Outlook]({email.web_link})"
        )
        lines.append("")
        lines.append(f"**Summary:** {result.summary}")
        lines.append("")
        if result.action_items:
            lines.append("**Action items:**")
            for a in result.action_items:
                lines.append(f"- {a}")
            lines.append("")
        if result.draft_reply:
            lines.append("**Draft reply:**")
            lines.append("")
            lines.append("> " + result.draft_reply.replace("\n", "\n> "))
            lines.append("")
        lines.append(f"_Reasoning: {result.reasoning}_")
        lines.append("")
        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    load_dotenv()
    args = parse_args()

    client_id = os.environ.get("MS_CLIENT_ID")
    tenant_id = os.environ.get("MS_TENANT_ID", "stanford.edu")
    if not client_id:
        print("error: MS_CLIENT_ID not set. Copy .env.example to .env and fill it in.", file=sys.stderr)
        return 2
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("error: ANTHROPIC_API_KEY not set.", file=sys.stderr)
        return 2

    print(f"Authenticating to Microsoft Graph (tenant: {tenant_id})...", file=sys.stderr)
    token = get_access_token(client_id=client_id, tenant_id=tenant_id)
    graph = GraphClient(token)

    print(f"Fetching up to {args.max} unread messages from '{args.folder}'...", file=sys.stderr)
    emails = graph.list_unread(folder=args.folder, top=args.max)
    if not emails:
        print("No unread messages. Inbox zero!", file=sys.stderr)
        return 0
    print(f"Found {len(emails)} unread. Running triage with Claude...", file=sys.stderr)

    triager = Triager()
    items: list[tuple[EmailMessage, TriageResult | None, str | None]] = []
    for i, email in enumerate(emails, 1):
        print(f"  [{i}/{len(emails)}] {email.subject[:60]}", file=sys.stderr)
        items.append(triage_one(triager, email))

    # Save drafts for action-worthy emails
    if args.drafts:
        threshold = PRIORITY_ORDER[args.min_priority]
        drafted = 0
        for email, result, err in items:
            if result is None or result.draft_reply is None:
                continue
            if PRIORITY_ORDER[result.priority] > threshold:
                continue
            try:
                graph.create_reply_draft(email.id, result.draft_reply)
                drafted += 1
            except Exception as e:
                print(
                    f"  draft failed for '{email.subject}': {type(e).__name__}: {e}",
                    file=sys.stderr,
                )
        print(f"Saved {drafted} draft replies to Outlook Drafts folder.", file=sys.stderr)

    # Report
    report = render_report(items)
    if args.report:
        report_path = args.report
    else:
        reports_dir = Path(__file__).parent / "reports"
        reports_dir.mkdir(exist_ok=True)
        report_path = reports_dir / f"triage_{datetime.now():%Y%m%d_%H%M%S}.md"

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report)
    print(f"\nReport written to: {report_path}", file=sys.stderr)
    print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
