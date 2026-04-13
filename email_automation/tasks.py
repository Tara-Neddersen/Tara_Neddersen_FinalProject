"""Persistent task list — action items that survive across runs.

tasks.json lives at the top level of this folder (git-ignored). The triage
pass adds new tasks from email action_items, deduplicating against prior
open tasks. The briefing shows open tasks sorted oldest-first so persistent
items bubble up until Tara handles them.

Schema:
    [
      {
        "id": "<8-char hash>",
        "text": "Reply to Sarah with Thursday availability",
        "source_email_id": "AAMk...",
        "source_sender": "Sarah Chen",
        "priority": "high",
        "created_at": "2026-04-13T10:00:00Z",
        "last_seen_at": "2026-04-15T07:00:00Z",
        "times_seen": 3,
        "status": "open"    // "open" | "done" | "dismissed"
      },
      ...
    ]
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

TASKS_PATH = Path(__file__).parent / "tasks.json"


@dataclass
class Task:
    id: str
    text: str
    source_email_id: str
    source_sender: str
    priority: str  # urgent / high / normal / low / skip
    created_at: str  # ISO
    last_seen_at: str
    times_seen: int = 1
    status: str = "open"

    @property
    def age_days(self) -> int:
        try:
            created = datetime.fromisoformat(self.created_at.replace("Z", "+00:00"))
        except ValueError:
            return 0
        return (datetime.now(timezone.utc) - created).days


def _hash_id(source_email_id: str, text: str) -> str:
    """Stable dedup key: same email + same action text = same task."""
    h = hashlib.sha256()
    h.update(source_email_id.encode())
    h.update(b"\x00")
    h.update(text.strip().lower().encode())
    return h.hexdigest()[:8]


def load() -> list[Task]:
    if not TASKS_PATH.exists():
        return []
    try:
        data = json.loads(TASKS_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return []
    tasks = []
    for d in data:
        try:
            tasks.append(Task(**d))
        except TypeError:
            continue  # skip malformed entries
    return tasks


def save(tasks: list[Task]) -> None:
    TASKS_PATH.write_text(
        json.dumps([asdict(t) for t in tasks], indent=2, ensure_ascii=False)
    )


def add_or_refresh(
    tasks: list[Task],
    source_email_id: str,
    source_sender: str,
    text: str,
    priority: str,
    now_iso: str,
) -> tuple[list[Task], bool]:
    """Add a new task, or bump last_seen_at/times_seen on an existing one.

    Returns (updated_tasks_list, was_new).
    """
    task_id = _hash_id(source_email_id, text)
    for t in tasks:
        if t.id == task_id and t.status == "open":
            t.last_seen_at = now_iso
            t.times_seen += 1
            # Priority can escalate if Claude thinks it's more urgent now
            if _priority_rank(priority) < _priority_rank(t.priority):
                t.priority = priority
            return tasks, False
    # New task
    tasks.append(
        Task(
            id=task_id,
            text=text,
            source_email_id=source_email_id,
            source_sender=source_sender,
            priority=priority,
            created_at=now_iso,
            last_seen_at=now_iso,
            times_seen=1,
            status="open",
        )
    )
    return tasks, True


def mark_done(tasks: list[Task], task_id: str) -> bool:
    for t in tasks:
        if t.id == task_id and t.status == "open":
            t.status = "done"
            return True
    return False


def mark_dismissed(tasks: list[Task], task_id: str) -> bool:
    for t in tasks:
        if t.id == task_id and t.status == "open":
            t.status = "dismissed"
            return True
    return False


def open_tasks(tasks: list[Task]) -> list[Task]:
    """Return open tasks sorted by priority desc, then age asc (oldest first)."""
    return sorted(
        (t for t in tasks if t.status == "open"),
        key=lambda t: (_priority_rank(t.priority), t.created_at),
    )


def _priority_rank(p: str) -> int:
    return {"urgent": 0, "high": 1, "normal": 2, "low": 3, "skip": 4}.get(p, 5)
