#!/usr/bin/env python3
"""Email triage CLI — judgment mode, no rules.

Fetches unread email from Outlook/Exchange via Microsoft Graph, then for each
message asks Claude — reading Tara's context files — to decide what to do:

    draft_for_review  - write a reply, save to Outlook Drafts (default)
    flag_urgent       - surface in briefing, Tara handles personally
    fyi_only          - note it, no action needed
    ignore            - don't surface at all

Every decision is logged to `decisions/` so you can give feedback on it
later via `feedback.py` — that feedback updates your context files and
the assistant gets smarter.

Usage:
    python triage.py                      # triage, log decisions, save drafts to Outlook
    python triage.py --no-drafts          # triage only, no Outlook draft creation
    python triage.py --dry-run            # no Outlook writes, no decision log
    python triage.py --max 50             # up to 50 unread messages
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

from claude_triage import Triager, TriageResult
from graph_auth import get_access_token
from graph_client import EmailMessage, GraphClient

PRIORITY_ORDER = {"urgent": 0, "high": 1, "normal": 2, "low": 3, "skip": 4}
PRIORITY_TAG = {
    "urgent": "[!]",
    "high": "[^]",
    "normal": "[ ]",
    "low": "[.]",
    "skip": "[x]",
}
ACTION_TAG = {
    "draft_for_review": "DRAFT",
    "flag_urgent": "FLAG ",
    "fyi_only": "FYI  ",
    "ignore": "SKIP ",
}

ROOT = Path(__file__).parent
DECISIONS_DIR = ROOT / "decisions"
REPORTS_DIR = ROOT / "reports"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Triage unread Outlook email with Claude.")
    p.add_argument(
        "--max",
        type=int,
        default=int(os.environ.get("MAX_EMAILS", "25")),
        help="Max number of unread messages to process (default: 25).",
    )
    p.add_argument(
        "--folder",
        default=os.environ.get("INBOX_FOLDER", "Inbox"),
        help="Mail folder to triage (default: Inbox).",
    )
    p.add_argument(
        "--no-drafts",
        action="store_true",
        help="Skip saving drafts to Outlook. Still runs triage and writes a report.",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't save drafts, don't log decisions. Useful for testing.",
    )
    p.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Write briefing to this path (default: reports/briefing_<timestamp>.md).",
    )
    return p.parse_args()


def triage_one(
    triager: Triager, email: EmailMessage
) -> tuple[EmailMessage, TriageResult | None, str | None]:
    """Returns (email, result, error)."""
    try:
        result = triager.triage(email)
        return email, result, None
    except Exception as e:  # safety net — one bad email shouldn't halt the batch
        return email, None, f"{type(e).__name__}: {e}"


def log_decision(
    email: EmailMessage, result: TriageResult, draft_id: str | None
) -> Path:
    """Persist a decision record so feedback.py can reference it later."""
    DECISIONS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    # Use a tiny prefix of the email id to avoid collisions in bulk runs
    stub = "".join(c for c in email.id[-8:] if c.isalnum())
    path = DECISIONS_DIR / f"{ts}_{stub}.json"
    record = {
        "timestamp": datetime.now().isoformat(),
        "email": {
            "id": email.id,
            "subject": email.subject,
            "sender_name": email.sender_name,
            "sender_email": email.sender_email,
            "received": email.received,
            "web_link": email.web_link,
            "body_preview": email.body_text[:500],
        },
        "result": {
            "action": result.action,
            "priority": result.priority,
            "summary": result.summary,
            "action_items": result.action_items,
            "draft_reply": result.draft_reply,
            "reasoning": result.reasoning,
        },
        "outlook_draft_id": draft_id,
        "feedback": None,
    }
    path.write_text(json.dumps(record, indent=2))
    return path


def render_briefing(
    items: list[tuple[EmailMessage, TriageResult | None, str | None]],
    drafts_saved: int,
) -> str:
    """Morning-briefing style markdown — what she actually reads."""
    # Group by action so urgent flags are unmissable
    flagged: list = []
    drafted: list = []
    fyi: list = []
    ignored: list = []
    failed: list = []

    for email, result, err in items:
        if err or result is None:
            failed.append((email, err))
            continue
        bucket = {
            "flag_urgent": flagged,
            "draft_for_review": drafted,
            "fyi_only": fyi,
            "ignore": ignored,
        }.get(result.action, drafted)
        bucket.append((email, result))

    # Sort each bucket by priority
    for bucket in (flagged, drafted, fyi):
        bucket.sort(key=lambda er: PRIORITY_ORDER[er[1].priority])

    lines: list[str] = []
    lines.append(f"# Briefing — {datetime.now():%A, %B %d · %H:%M}")
    lines.append("")
    lines.append(
        f"Processed **{len(items)}** unread · "
        f"**{len(flagged)}** flagged · "
        f"**{len(drafted)}** drafted · "
        f"**{len(fyi)}** fyi · "
        f"**{len(ignored)}** ignored"
        + (f" · **{len(failed)}** failed" if failed else "")
    )
    if drafts_saved:
        lines.append(f"\n{drafts_saved} draft(s) saved to your Outlook Drafts folder.")
    lines.append("")

    if flagged:
        lines.append("## Needs you")
        lines.append("")
        for email, r in flagged:
            lines.append(_render_email_block(email, r, show_draft=False))
        lines.append("")

    # To-do roll-up: pull action items from everything except ignored
    todos = []
    for email, r in drafted + flagged + fyi:
        for a in r.action_items:
            todos.append((r.priority, email.sender_name or email.sender_email, a))
    if todos:
        todos.sort(key=lambda x: PRIORITY_ORDER[x[0]])
        lines.append("## To-Do")
        lines.append("")
        for priority, sender, action in todos:
            lines.append(f"- {PRIORITY_TAG[priority]} **{sender}** — {action}")
        lines.append("")

    if drafted:
        lines.append("## Drafts ready in Outlook")
        lines.append("")
        for email, r in drafted:
            lines.append(_render_email_block(email, r, show_draft=True))
        lines.append("")

    if fyi:
        lines.append("## FYI")
        lines.append("")
        for email, r in fyi:
            lines.append(_render_email_block(email, r, show_draft=False, compact=True))
        lines.append("")

    if ignored:
        lines.append("## Ignored (noise)")
        lines.append("")
        for email, r in ignored:
            lines.append(
                f"- _{email.sender_name or email.sender_email}_ — {email.subject}"
            )
        lines.append("")

    if failed:
        lines.append("## Triage failures")
        lines.append("")
        for email, err in failed:
            lines.append(f"- **{email.subject}** — `{err}`")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append(
        "_Give the assistant feedback on any decision:_ "
        "`python feedback.py`"
    )
    lines.append("")
    return "\n".join(lines)


def _render_email_block(
    email: EmailMessage,
    r: TriageResult,
    show_draft: bool,
    compact: bool = False,
) -> str:
    out: list[str] = []
    tag = PRIORITY_TAG[r.priority]
    out.append(f"### {tag} {email.subject}")
    out.append("")
    out.append(
        f"From: {email.sender_name} <{email.sender_email}>  "
        f"· [Open in Outlook]({email.web_link})"
    )
    out.append("")
    out.append(f"**Summary:** {r.summary}")
    if r.action_items and not compact:
        out.append("")
        out.append("**Action items:**")
        for a in r.action_items:
            out.append(f"- {a}")
    if show_draft and r.draft_reply:
        out.append("")
        out.append("**Draft reply (in Outlook Drafts, review + send):**")
        out.append("")
        out.append("> " + r.draft_reply.replace("\n", "\n> "))
    if not compact:
        out.append("")
        out.append(f"_Why: {r.reasoning}_")
    out.append("")
    out.append("---")
    out.append("")
    return "\n".join(out)


def main() -> int:
    load_dotenv()
    args = parse_args()

    client_id = os.environ.get("MS_CLIENT_ID")
    tenant_id = os.environ.get("MS_TENANT_ID", "stanford.edu")
    if not client_id:
        print(
            "error: MS_CLIENT_ID not set. Copy .env.example to .env and fill it in.",
            file=sys.stderr,
        )
        return 2
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("error: ANTHROPIC_API_KEY not set.", file=sys.stderr)
        return 2

    print(
        f"Authenticating to Microsoft Graph (tenant: {tenant_id})...",
        file=sys.stderr,
    )
    token = get_access_token(client_id=client_id, tenant_id=tenant_id)
    graph = GraphClient(token)

    print(
        f"Fetching up to {args.max} unread messages from '{args.folder}'...",
        file=sys.stderr,
    )
    emails = graph.list_unread(folder=args.folder, top=args.max)
    if not emails:
        print("No unread messages. Inbox zero!", file=sys.stderr)
        return 0
    print(
        f"Found {len(emails)} unread. Running triage with Claude...",
        file=sys.stderr,
    )

    triager = Triager()
    items: list[tuple[EmailMessage, TriageResult | None, str | None]] = []
    for i, email in enumerate(emails, 1):
        print(f"  [{i}/{len(emails)}] {email.subject[:60]}", file=sys.stderr)
        items.append(triage_one(triager, email))

    # Save drafts to Outlook + log decisions
    drafts_saved = 0
    save_drafts = not (args.no_drafts or args.dry_run)
    for email, result, err in items:
        if result is None:
            continue
        draft_id: str | None = None
        if save_drafts and result.action == "draft_for_review" and result.draft_reply:
            try:
                draft_id = graph.create_reply_draft(email.id, result.draft_reply)
                drafts_saved += 1
            except Exception as e:
                print(
                    f"  draft failed for '{email.subject}': {type(e).__name__}: {e}",
                    file=sys.stderr,
                )
        if not args.dry_run:
            log_decision(email, result, draft_id)

    if save_drafts:
        print(
            f"Saved {drafts_saved} draft replies to Outlook Drafts folder.",
            file=sys.stderr,
        )

    # Briefing
    briefing = render_briefing(items, drafts_saved)
    if args.report:
        report_path = args.report
    else:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        report_path = REPORTS_DIR / f"briefing_{datetime.now():%Y%m%d_%H%M%S}.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(briefing)
    print(f"\nBriefing written to: {report_path}", file=sys.stderr)
    print(briefing)
    return 0


if __name__ == "__main__":
    sys.exit(main())
