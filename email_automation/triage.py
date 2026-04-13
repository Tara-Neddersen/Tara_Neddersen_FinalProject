#!/usr/bin/env python3
"""Email triage CLI — judgment mode, no rules.

Fetches unread email from Outlook/Exchange via Microsoft Graph, reads Tara's
context + calendar, and for each message asks Claude to decide what to do:

    draft_for_review  - write a reply, save to Outlook Drafts (default)
    flag_urgent       - surface in briefing, Tara handles personally
    fyi_only          - note it, no action needed
    ignore            - don't surface at all

Emails we've triaged before but that are STILL unread get flagged in the
briefing as "you've been avoiding these" so they don't silently rot.

Every decision is logged to decisions/ so you can give feedback via
feedback.py. Action items accumulate into tasks.json, surviving across runs.

Usage:
    python triage.py                      # triage, log decisions, save drafts
    python triage.py --no-drafts          # triage only, no Outlook draft creation
    python triage.py --dry-run            # no Outlook writes, no state changes
    python triage.py --max 50             # up to 50 unread messages
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

import tasks
from claude_triage import Triager, TriageResult
from graph_auth import get_access_token
from graph_client import EmailMessage, GraphClient
from history import PriorSighting, load_prior_sightings

PRIORITY_ORDER = {"urgent": 0, "high": 1, "normal": 2, "low": 3, "skip": 4}
PRIORITY_TAG = {
    "urgent": "[!]",
    "high": "[^]",
    "normal": "[ ]",
    "low": "[.]",
    "skip": "[x]",
}

ROOT = Path(__file__).parent
DECISIONS_DIR = ROOT / "decisions"
REPORTS_DIR = ROOT / "reports"

# An email has been "avoided" if we saw it N days ago and it's still unread.
AVOIDED_THRESHOLD_DAYS = 2


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
        help="Don't save drafts, don't log decisions, don't update tasks.",
    )
    p.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Write briefing to this path (default: reports/briefing_<timestamp>.md).",
    )
    return p.parse_args()


def triage_one(
    triager: Triager, graph: GraphClient, email: EmailMessage
) -> tuple[EmailMessage, TriageResult | None, str | None]:
    """Fetch thread history for this email then triage it."""
    try:
        thread = graph.get_conversation_thread(
            email.conversation_id, exclude_message_id=email.id, limit=15
        )
        result = triager.triage(email, thread=thread)
        return email, result, None
    except Exception as e:  # safety net — one bad email shouldn't halt the batch
        return email, None, f"{type(e).__name__}: {e}"


def log_decision(
    email: EmailMessage, result: TriageResult, draft_id: str | None
) -> Path:
    """Persist a decision record so feedback.py can reference it later."""
    DECISIONS_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    stub = "".join(c for c in email.id[-8:] if c.isalnum())
    path = DECISIONS_DIR / f"{ts}_{stub}.json"
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
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


def accumulate_tasks(
    items: list[tuple[EmailMessage, TriageResult | None, str | None]],
) -> tuple[list[tasks.Task], int]:
    """Merge newly-derived action_items into tasks.json. Returns (all_tasks, new_count)."""
    existing = tasks.load()
    now_iso = datetime.now(timezone.utc).isoformat()
    new_count = 0
    for email, result, err in items:
        if result is None:
            continue
        for action_text in result.action_items:
            existing, was_new = tasks.add_or_refresh(
                existing,
                source_email_id=email.id,
                source_sender=email.sender_name or email.sender_email,
                text=action_text,
                priority=result.priority,
                now_iso=now_iso,
            )
            if was_new:
                new_count += 1
    tasks.save(existing)
    return existing, new_count


def find_avoided_emails(
    current_unread: list[EmailMessage],
    prior: dict[str, PriorSighting],
    threshold_days: int = AVOIDED_THRESHOLD_DAYS,
) -> list[tuple[EmailMessage, PriorSighting]]:
    """Return (email, prior_sighting) pairs for unread emails we've seen before."""
    avoided = []
    for email in current_unread:
        sighting = prior.get(email.id)
        if sighting is None:
            continue
        if sighting.days_avoided < threshold_days:
            continue
        avoided.append((email, sighting))
    # Worst-avoided first
    avoided.sort(key=lambda es: -es[1].days_avoided)
    return avoided


def render_briefing(
    items: list[tuple[EmailMessage, TriageResult | None, str | None]],
    drafts_saved: int,
    avoided: list[tuple[EmailMessage, PriorSighting]],
    open_tasks: list[tasks.Task],
    new_task_count: int,
) -> str:
    """Morning-briefing style markdown — what she actually reads."""
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

    # 1. Avoided emails — top of the briefing so they're unmissable
    if avoided:
        lines.append("## You've been avoiding these")
        lines.append("")
        lines.append(
            "_Emails the assistant triaged before that are still sitting "
            "unread in your inbox. Just deal with one today._"
        )
        lines.append("")
        for email, sighting in avoided:
            days = sighting.days_avoided
            tag = PRIORITY_TAG.get(sighting.last_priority, "[ ]")
            lines.append(
                f"- {tag} **{days}d** — _{sighting.sender_name}_ — "
                f"[{email.subject}]({email.web_link}) "
                f"(seen {sighting.times_seen}×)"
            )
        lines.append("")

    # 2. Urgent flags
    if flagged:
        lines.append("## Needs you")
        lines.append("")
        for email, r in flagged:
            lines.append(_render_email_block(email, r, show_draft=False))
        lines.append("")

    # 3. Open tasks (persistent across runs)
    if open_tasks:
        lines.append("## Open tasks")
        lines.append("")
        if new_task_count:
            lines.append(f"_{new_task_count} new this run._")
            lines.append("")
        for t in open_tasks[:20]:  # cap so the briefing stays readable
            tag = PRIORITY_TAG.get(t.priority, "[ ]")
            age = f"{t.age_days}d" if t.age_days > 0 else "new"
            seen = f" ({t.times_seen}×)" if t.times_seen > 1 else ""
            lines.append(
                f"- {tag} `{t.id}` {age}{seen} · **{t.source_sender}** — {t.text}"
            )
        if len(open_tasks) > 20:
            lines.append(f"- _...and {len(open_tasks) - 20} more in tasks.json_")
        lines.append("")
        lines.append(
            "_Mark done: `python feedback.py --done <id>`  ·  "
            "Dismiss: `python feedback.py --dismiss <id>`_"
        )
        lines.append("")

    # 4. Drafts ready
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
        "_Feedback on any decision:_ `python feedback.py`  ·  "
        "_Notes that reshape context:_ `python feedback.py --note \"...\"`"
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
        f"Found {len(emails)} unread. Checking history for avoided emails...",
        file=sys.stderr,
    )
    prior = load_prior_sightings()
    avoided = find_avoided_emails(emails, prior)
    if avoided:
        print(
            f"  {len(avoided)} email(s) have been unread for {AVOIDED_THRESHOLD_DAYS}+ days",
            file=sys.stderr,
        )

    print("Fetching your calendar (next 7 days)...", file=sys.stderr)
    try:
        calendar_events = graph.get_upcoming_events(days_ahead=7)
        print(
            f"  calendar loaded: {len(calendar_events)} event(s) in the next week",
            file=sys.stderr,
        )
    except Exception as e:
        print(
            f"  could not load calendar ({type(e).__name__}: {e}). "
            "Continuing without calendar context.",
            file=sys.stderr,
        )
        calendar_events = []

    print("Running triage with Claude...", file=sys.stderr)
    triager = Triager(calendar_events=calendar_events)
    items: list[tuple[EmailMessage, TriageResult | None, str | None]] = []
    for i, email in enumerate(emails, 1):
        print(f"  [{i}/{len(emails)}] {email.subject[:60]}", file=sys.stderr)
        items.append(triage_one(triager, graph, email))

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

    # Persistent task accumulation
    new_task_count = 0
    open_tasks: list[tasks.Task] = []
    if not args.dry_run:
        all_tasks, new_task_count = accumulate_tasks(items)
        open_tasks = tasks.open_tasks(all_tasks)
        print(
            f"Tasks: {len(open_tasks)} open ({new_task_count} new this run).",
            file=sys.stderr,
        )

    # Briefing
    briefing = render_briefing(
        items, drafts_saved, avoided, open_tasks, new_task_count
    )
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
