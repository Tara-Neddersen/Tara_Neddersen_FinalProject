"""Cross-run state: what we've seen before.

Loads every prior decision record from decisions/ and answers:
    - "Is this email one we've triaged before?"
    - "How long have I been avoiding it?"

Used by triage.py to surface stale emails at the top of the briefing.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

DECISIONS_DIR = Path(__file__).parent / "decisions"


@dataclass
class PriorSighting:
    """A record of an email we previously triaged but which is still unread."""

    email_id: str
    subject: str
    sender_name: str
    first_triaged_at: datetime
    last_triaged_at: datetime
    times_seen: int
    last_action: str
    last_priority: str

    @property
    def days_avoided(self) -> int:
        return (datetime.now(timezone.utc) - self.first_triaged_at).days


def load_prior_sightings() -> dict[str, PriorSighting]:
    """Return a map of email_id -> earliest/latest sighting record.

    Works by scanning every decision file in decisions/ and folding them
    into one record per email_id, keeping first-seen and last-seen timestamps.
    """
    if not DECISIONS_DIR.exists():
        return {}
    sightings: dict[str, PriorSighting] = {}
    for path in sorted(DECISIONS_DIR.glob("*.json")):
        try:
            record = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        email = record.get("email") or {}
        email_id = email.get("id")
        if not email_id:
            continue
        ts_raw = record.get("timestamp") or ""
        try:
            ts = datetime.fromisoformat(ts_raw)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        result = record.get("result") or {}
        existing = sightings.get(email_id)
        if existing is None:
            sightings[email_id] = PriorSighting(
                email_id=email_id,
                subject=email.get("subject", "(no subject)"),
                sender_name=email.get("sender_name", "") or email.get("sender_email", ""),
                first_triaged_at=ts,
                last_triaged_at=ts,
                times_seen=1,
                last_action=result.get("action", "?"),
                last_priority=result.get("priority", "?"),
            )
        else:
            existing.times_seen += 1
            if ts < existing.first_triaged_at:
                existing.first_triaged_at = ts
            if ts > existing.last_triaged_at:
                existing.last_triaged_at = ts
                existing.last_action = result.get("action", existing.last_action)
                existing.last_priority = result.get(
                    "priority", existing.last_priority
                )
    return sightings
