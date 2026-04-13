"""Claude-powered email triage with judgment, not rules.

The assistant reads Tara's context files (about_me, current_state, per-person
notes) on every run and reasons from that context — the same way a real EA
would. No rulebook, no if-then chains. Just: given what I know about Tara,
given her current state, given who this is, what should I do?

Uses:
  - Claude Opus 4.6 with adaptive thinking (let it actually think)
  - Structured outputs (Pydantic) for reliable JSON
  - Prompt caching on the context (stable across every email in a run)
  - Calendar snapshot (next 7 days) — for grounded scheduling replies
  - Thread history — for replies that reference what was already said
"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from graph_client import CalendarEvent, EmailMessage, ThreadMessage

MODEL = "claude-opus-4-6"

CONTEXT_DIR = Path(__file__).parent / "context"
PEOPLE_DIR = CONTEXT_DIR / "people"


SYSTEM_PROMPT_HEADER = """You are Tara Neddersen's personal assistant. Think of yourself as a second Tara — someone who has spent time with her, knows her voice, knows what she's dealing with, and can make good decisions on her behalf.

You do NOT follow a rulebook. You reason from context, like a thoughtful friend would. When you make a decision, you explain your reasoning so Tara can give you feedback that improves your judgment over time.

Your guiding principle: Tara is burnt out and overwhelmed. Every decision should reduce her cognitive load, not add to it. When in doubt, draft a response but don't send it — flag it for her review. The bar to auto-handle something is high; she has to trust you first.

Below is everything you know about Tara. Read it carefully — every word matters, because you'll be reasoning from it."""


SYSTEM_PROMPT_FOOTER = """---

For each email you see, produce a judgment:

1. **action** — one of:
   - `draft_for_review`: Write a draft reply, save it to Outlook Drafts, Tara will review and send. **This is your default — pick it unless you have specific reason to choose something else.**
   - `flag_urgent`: Tara needs to see this now. Do not draft a reply (she'll want to handle it personally).
   - `fyi_only`: Worth her knowing about, no action needed. No draft.
   - `ignore`: Newsletter, spam, automated notification. Don't surface in the briefing.

2. **priority** — `urgent` / `high` / `normal` / `low` / `skip`. Use your judgment based on what you know about Tara's priorities and current state.

3. **summary** — 1-2 sentences: what does this person actually want from Tara?

4. **action_items** — concrete things Tara needs to do (if any). Empty list if none.

5. **draft_reply** — the actual reply text in Tara's voice, OR null if no draft is warranted. Remember her communication style: warm but direct, no fluff, signs off "Tara". Do not invent facts or promise timelines she hasn't committed to. When you need information she hasn't given you, ask for it or leave a clear [[placeholder]] for her to fill in.

   **Scheduling replies:** When the email proposes a meeting time, use Tara's calendar (below) to check whether she's actually free before committing. If she is, commit. If she isn't, propose a specific alternative using a free block you can see on her calendar. Don't invent availability — if her calendar is blocked or unclear, say "let me check my calendar and get back to you" rather than guess.

   **Replies in a thread:** If there's a prior conversation history below, reference it naturally. Don't repeat yourself. Don't pretend not to know what was already discussed.

6. **reasoning** — 2-4 sentences explaining *why* you made this call. This is for Tara to read and give you feedback on. Be specific about what in her context informed your decision. If you used the calendar or thread history, cite it.

Rules that ARE non-negotiable (the only ones):
- Never auto-send. Always draft for review.
- Never invent facts or make commitments for Tara.
- Only commit to specific meeting times if the calendar shows her as free at that time.
- If you're uncertain, say so in your reasoning and pick the more cautious action."""


class TriageResult(BaseModel):
    action: Literal["draft_for_review", "flag_urgent", "fyi_only", "ignore"] = Field(
        description="What to do with this email"
    )
    priority: Literal["urgent", "high", "normal", "low", "skip"] = Field(
        description="Priority level"
    )
    summary: str = Field(description="1-2 sentence plain-English summary")
    action_items: list[str] = Field(
        default_factory=list,
        description="Concrete tasks for Tara (empty if none)",
    )
    draft_reply: str | None = Field(
        default=None,
        description="Draft reply in Tara's voice, or null if no draft warranted",
    )
    reasoning: str = Field(
        description="Why you made this call — specific reference to her context"
    )


def _safe_person_filename(email_address: str) -> str:
    """Convert email@domain.com -> email_domain.com.md, stripped of path chars."""
    safe = email_address.lower().replace("@", "_")
    safe = re.sub(r"[^a-z0-9._-]", "_", safe)
    return f"{safe}.md"


def _load_person_context(email_address: str) -> str | None:
    """Load the per-person note file if one exists."""
    if not email_address:
        return None
    path = PEOPLE_DIR / _safe_person_filename(email_address)
    if path.exists() and path.is_file():
        return path.read_text()
    return None


def _load_general_context() -> str:
    """Load all markdown files in context/ (excluding per-person notes)."""
    parts = []
    # Known-order files first (about_me, current_state). Then any other loose
    # markdown Tara has dropped into the folder (e.g. tasks.md, notes.md).
    priority_files = ["about_me.md", "current_state.md", "tasks.md"]
    seen = set()
    for name in priority_files:
        path = CONTEXT_DIR / name
        if path.exists() and path.is_file():
            parts.append(f"# ==== {name} ====\n\n{path.read_text()}")
            seen.add(path.name)
    # Pick up any other md files at the top level of context/
    for path in sorted(CONTEXT_DIR.glob("*.md")):
        if path.name in seen:
            continue
        parts.append(f"# ==== {path.name} ====\n\n{path.read_text()}")
    if not parts:
        return (
            "(No context files found. Create email_automation/context/about_me.md "
            "to teach the assistant about yourself.)"
        )
    return "\n\n".join(parts)


def _format_calendar(events: list[CalendarEvent]) -> str:
    """Render the user's next-7-days schedule as markdown for the LLM."""
    if not events:
        return "Calendar: no events on Tara's calendar in the next 7 days."
    now = datetime.now().astimezone()
    lines = [
        f"Calendar (next 7 days, as of {now:%A %Y-%m-%d %H:%M %Z}):",
        "",
    ]
    for e in events:
        # Render the ISO timestamps compactly and human-readably
        start_h = _human_time(e.start, all_day=e.is_all_day)
        end_h = _human_time(e.end, all_day=e.is_all_day)
        busy = "" if e.show_as == "busy" else f" [{e.show_as}]"
        loc = f" @ {e.location}" if e.location else ""
        online = " (online)" if e.is_online else ""
        lines.append(
            f"- {start_h} – {end_h}: {e.subject}{loc}{online}{busy}"
        )
    return "\n".join(lines)


def _human_time(iso: str, all_day: bool = False) -> str:
    """Turn '2026-04-14T15:30:00.0000000' into 'Tue Apr 14, 3:30pm'."""
    if not iso:
        return "?"
    # Strip fractional seconds + Z suffix etc.; datetime.fromisoformat handles
    # most real-world variants from Graph.
    try:
        # Graph returns naive ISO without Z sometimes; assume UTC if so.
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return iso
    if all_day:
        return f"{dt:%a %b %d} (all-day)"
    return f"{dt:%a %b %d %-I:%M%p}"


def _format_thread(thread: list[ThreadMessage]) -> str:
    """Render prior conversation messages for the LLM."""
    if not thread:
        return ""
    lines = [
        "Prior messages in this conversation (oldest first):",
        "",
    ]
    for m in thread:
        who = "Tara" if m.is_from_me else f"{m.sender_name} <{m.sender_email}>"
        lines.append(f"--- From: {who} · {m.sent_at} ---")
        lines.append(m.body_text or "(empty)")
        lines.append("")
    return "\n".join(lines)


def _format_email(email: EmailMessage) -> str:
    body = email.body_text
    if len(body) > 6000:
        body = body[:6000] + "\n\n[... truncated ...]"
    return (
        f"From: {email.sender_name} <{email.sender_email}>\n"
        f"Received: {email.received}\n"
        f"Subject: {email.subject}\n\n"
        f"{body}"
    )


class Triager:
    def __init__(
        self,
        client: anthropic.Anthropic | None = None,
        calendar_events: list[CalendarEvent] | None = None,
    ) -> None:
        self.client = client or anthropic.Anthropic()
        # Load context once per run — stable across all emails this session
        self._general_context = _load_general_context()
        # Calendar snapshot is fetched once per run too
        self._calendar_snapshot = _format_calendar(calendar_events or [])

    def _build_system_prompt(self, person_context: str | None) -> list[dict]:
        """Build the system prompt blocks, with caching on the stable prefix."""
        body = (
            f"{SYSTEM_PROMPT_HEADER}\n\n"
            f"{self._general_context}\n\n"
            f"---\n\n{self._calendar_snapshot}\n\n"
            f"{SYSTEM_PROMPT_FOOTER}"
        )
        blocks: list[dict] = [
            {
                "type": "text",
                "text": body,
                # Identical across every email in a run -> cache it.
                "cache_control": {"type": "ephemeral"},
            }
        ]
        # Per-person context goes AFTER the cached block so cache still hits
        if person_context:
            blocks.append(
                {
                    "type": "text",
                    "text": (
                        "---\n\n"
                        "Additional context about the sender of the email "
                        "you're about to triage:\n\n"
                        f"{person_context}"
                    ),
                }
            )
        return blocks

    def triage(
        self,
        email: EmailMessage,
        thread: list[ThreadMessage] | None = None,
    ) -> TriageResult:
        """Triage a single email with full context, calendar, and thread history."""
        person_context = _load_person_context(email.sender_email)
        thread_text = _format_thread(thread or [])

        user_parts: list[str] = []
        if thread_text:
            user_parts.append(thread_text)
            user_parts.append("---")
        user_parts.append(
            "Here is the new unread email in Tara's inbox. Reason about "
            "what she would do, then decide.\n\n"
            "```\n"
            f"{_format_email(email)}\n"
            "```"
        )
        user_content = "\n\n".join(user_parts)

        response = self.client.messages.parse(
            model=MODEL,
            max_tokens=3000,
            thinking={"type": "adaptive"},
            system=self._build_system_prompt(person_context),
            messages=[{"role": "user", "content": user_content}],
            output_format=TriageResult,
        )
        return response.parsed_output
