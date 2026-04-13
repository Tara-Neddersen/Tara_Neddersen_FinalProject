"""Claude-powered email triage with judgment, not rules.

The assistant reads Tara's context files (about_me, current_state, per-person
notes) on every run and reasons from that context — the same way a real EA
would. No rulebook, no if-then chains. Just: given what I know about Tara,
given her current state, given who this is, what should I do?

Uses:
  - Claude Opus 4.6 with adaptive thinking (let it actually think)
  - Structured outputs (Pydantic) for reliable JSON
  - Prompt caching on the context (stable across every email in a run)
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from graph_client import EmailMessage

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

6. **reasoning** — 2-4 sentences explaining *why* you made this call. This is for Tara to read and give you feedback on. Be specific about what in her context informed your decision. E.g. "Your about_me says Prof. Knowles supersedes everything, and she's asking for the figure revision by Friday. Drafted a short reply committing to Thursday delivery since your current_state shows you have a free block Wed afternoon."

Rules that ARE non-negotiable (the only ones):
- Never auto-send. Always draft for review.
- Never invent facts or make commitments for Tara.
- Never schedule meetings at specific times without checking her calendar (and you can't, so always propose ranges).
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
    """Load about_me.md + current_state.md, stitched together."""
    parts = []
    for name in ("about_me.md", "current_state.md"):
        path = CONTEXT_DIR / name
        if path.exists():
            parts.append(f"# ==== {name} ====\n\n{path.read_text()}")
    if not parts:
        return (
            "(No context files found. Create email_automation/context/about_me.md "
            "to teach the assistant about yourself.)"
        )
    return "\n\n".join(parts)


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
    def __init__(self, client: anthropic.Anthropic | None = None) -> None:
        self.client = client or anthropic.Anthropic()
        # Load once per run — context is stable across all emails this session
        self._general_context = _load_general_context()

    def _build_system_prompt(self, person_context: str | None) -> list[dict]:
        """Build the system prompt blocks, with caching on the stable prefix."""
        body = (
            f"{SYSTEM_PROMPT_HEADER}\n\n"
            f"{self._general_context}\n\n"
            f"{SYSTEM_PROMPT_FOOTER}"
        )
        blocks: list[dict] = [
            {
                "type": "text",
                "text": body,
                # This block is identical across every email in a run -> cache it
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

    def triage(self, email: EmailMessage) -> TriageResult:
        """Triage a single email with full context + adaptive thinking."""
        person_context = _load_person_context(email.sender_email)
        response = self.client.messages.parse(
            model=MODEL,
            max_tokens=3000,
            thinking={"type": "adaptive"},
            system=self._build_system_prompt(person_context),
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Here is an unread email in Tara's inbox. Reason about "
                        "what she would do, then decide.\n\n"
                        "```\n"
                        f"{_format_email(email)}\n"
                        "```"
                    ),
                }
            ],
            output_format=TriageResult,
        )
        return response.parsed_output
