"""Claude-powered email triage.

Uses the Anthropic SDK with:
  - structured outputs (Pydantic schema) for reliable JSON
  - prompt caching on the system prompt (stable across every email)
  - Claude Opus 4.6 with adaptive thinking
"""
from __future__ import annotations

from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from graph_client import EmailMessage

MODEL = "claude-opus-4-6"

SYSTEM_PROMPT = """You are an executive assistant triaging email for Tara Neddersen, a neuroscience researcher at Stanford University's Knowles Lab (Department of Neurology). Tara works on neuroimaging analysis (MRI preprocessing, brain extraction, BIDS-format data).

For each email you are shown, produce:

1. priority — one of:
   - "urgent":  deadline today/tomorrow, from PI / advisor / direct collaborators, or explicitly time-sensitive
   - "high":    meaningful action required this week (meeting requests, paper reviews, collaborator questions)
   - "normal":  routine but worth reading (lab announcements, non-urgent admin)
   - "low":     newsletters, mass announcements, automated notifications
   - "skip":    obvious spam / promotional / no action possible

2. summary — 1-2 sentences in plain English, focused on WHAT the sender wants from Tara.

3. action_items — concrete things Tara needs to do (if any). Empty list if none.
   Each item: a short imperative ("Reply with availability for Thursday", "Review attached draft by Friday").

4. draft_reply — a polite, concise draft reply in Tara's voice, OR null if no reply is warranted (newsletter, FYI, spam).
   Tara's voice: warm but professional, direct, no fluff, signs off "Tara". Do not invent commitments she hasn't made — if you need information she hasn't given you, ask for it or leave a clear [[placeholder]] for her to fill in.

5. reasoning — one sentence explaining the priority classification.

Rules:
- Never invent facts. If the email asks a factual question you can't answer, the draft should ask for clarification or say she'll follow up.
- Never schedule meetings at specific times — propose "sometime next week" or ask for the sender's availability.
- Keep drafts under 120 words unless the email genuinely requires more.
"""


class TriageResult(BaseModel):
    priority: Literal["urgent", "high", "normal", "low", "skip"] = Field(
        description="Priority classification"
    )
    summary: str = Field(description="1-2 sentence plain-English summary")
    action_items: list[str] = Field(
        default_factory=list,
        description="Concrete tasks for Tara (empty if none)",
    )
    draft_reply: str | None = Field(
        default=None,
        description="Draft reply in Tara's voice, or null if no reply needed",
    )
    reasoning: str = Field(description="One-sentence priority justification")


def _format_email(email: EmailMessage) -> str:
    # Cap body to a reasonable length — emails with huge quoted threads waste tokens.
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

    def triage(self, email: EmailMessage) -> TriageResult:
        """Triage a single email. Returns a validated TriageResult."""
        response = self.client.messages.parse(
            model=MODEL,
            max_tokens=2000,
            # Cache the system prompt — it's identical across every email this run,
            # so subsequent calls pay ~0.1x for the cached portion.
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Triage the following email:\n\n"
                        "```\n"
                        f"{_format_email(email)}\n"
                        "```"
                    ),
                }
            ],
            output_format=TriageResult,
        )
        return response.parsed_output
