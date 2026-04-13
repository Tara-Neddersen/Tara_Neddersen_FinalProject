"""Feedback CLI — teach the assistant what it got wrong (or right).

Usage:
    python feedback.py                    # interactive: walks through latest decisions
    python feedback.py --decision <id>    # give feedback on a specific decision
    python feedback.py --note "<freeform>" # add a freeform note to about_me.md

When you give feedback, Claude reads your current context + the decision +
your feedback, and proposes an update to the relevant context file. You
approve the diff before it's written.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import anthropic
from dotenv import load_dotenv

import tasks

MODEL = "claude-opus-4-6"

ROOT = Path(__file__).parent
CONTEXT_DIR = ROOT / "context"
DECISIONS_DIR = ROOT / "decisions"

UPDATE_SYSTEM = """You are helping Tara maintain the context files her AI assistant reads on every run. She is giving you feedback on a decision the assistant made — your job is to update the relevant context file(s) so the assistant makes a better decision next time.

Rules:
- Edit context prose to reflect what she told you. Do NOT add a bullet list of rules.
- Write in the same voice as the existing file — first-person, plain English, the way Tara would describe herself to a new EA.
- Preserve everything in the file that's unrelated to this feedback.
- Be conservative: small, targeted changes. Don't rewrite paragraphs that weren't affected.
- If the feedback is about a specific person, it probably belongs in `context/people/<person>.md` (create if missing), not `about_me.md`.
- If the feedback is about current circumstances (this week, this month), it belongs in `current_state.md`.
- If the feedback is about who Tara is long-term, it belongs in `about_me.md`.

Return your response as JSON with this shape:
{
  "target_file": "context/about_me.md",
  "updated_content": "<the full new contents of the file>",
  "explanation": "<one sentence: what you changed and why>"
}
"""


def list_decisions() -> list[Path]:
    if not DECISIONS_DIR.exists():
        return []
    return sorted(DECISIONS_DIR.glob("*.json"), reverse=True)


def load_decision(path: Path) -> dict:
    return json.loads(path.read_text())


def snapshot_context() -> dict[str, str]:
    """Gather all context files so Claude can decide which to update."""
    files = {}
    for path in CONTEXT_DIR.rglob("*.md"):
        rel = path.relative_to(ROOT)
        files[str(rel)] = path.read_text()
    return files


def ask_claude_for_update(
    client: anthropic.Anthropic,
    feedback_text: str,
    decision: dict | None,
    context_files: dict[str, str],
) -> dict:
    context_blob = "\n\n".join(
        f"=== {path} ===\n{content}" for path, content in context_files.items()
    )
    decision_blob = ""
    if decision is not None:
        decision_blob = (
            "\n\n## The decision Tara is giving feedback on:\n\n"
            f"```json\n{json.dumps(decision, indent=2)}\n```"
        )
    user_message = (
        f"## Current context files:\n\n{context_blob}"
        f"{decision_blob}\n\n"
        f"## Tara's feedback:\n\n{feedback_text}\n\n"
        "Decide which file to update and return the full updated contents "
        "as JSON."
    )
    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        system=UPDATE_SYSTEM,
        messages=[{"role": "user", "content": user_message}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    # The model may wrap JSON in a code block; strip that if present
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        if text.startswith("json"):
            text = text[4:].lstrip()
    return json.loads(text)


def confirm_and_write(update: dict) -> bool:
    target_rel = update["target_file"]
    target_path = ROOT / target_rel
    new_content = update["updated_content"]
    explanation = update.get("explanation", "(no explanation)")

    print(f"\nProposed update: {target_rel}")
    print(f"Explanation: {explanation}")
    print()

    old_content = target_path.read_text() if target_path.exists() else ""
    if old_content == new_content:
        print("(no change — file content identical)")
        return False

    # Show a simple diff
    _print_minimal_diff(old_content, new_content)

    answer = input("\nApply this update? [y/N]: ").strip().lower()
    if answer != "y":
        print("Skipped.")
        return False
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(new_content)
    print(f"Updated {target_rel}")
    return True


def _print_minimal_diff(old: str, new: str) -> None:
    """Dirt-simple line-by-line diff for terminal display."""
    import difflib

    diff = difflib.unified_diff(
        old.splitlines(keepends=True),
        new.splitlines(keepends=True),
        fromfile="before",
        tofile="after",
        n=3,
    )
    sys.stdout.writelines(diff)


def interactive_mode(client: anthropic.Anthropic) -> None:
    decisions = list_decisions()
    if not decisions:
        print("No decisions logged yet. Run triage first.")
        return

    print(f"Found {len(decisions)} logged decisions. Most recent first.\n")
    for i, path in enumerate(decisions[:10], 1):
        d = load_decision(path)
        subj = d.get("email", {}).get("subject", "(no subject)")[:70]
        action = d.get("result", {}).get("action", "?")
        sender = d.get("email", {}).get("sender_name", "")
        print(f"  [{i}] {action:20s} — {sender[:25]:25s} — {subj}")

    sel = input("\nWhich decision to give feedback on? (number, or 'q' to quit): ").strip()
    if sel.lower() == "q" or not sel:
        return
    try:
        idx = int(sel) - 1
        decision_path = decisions[idx]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    decision = load_decision(decision_path)
    print(f"\n--- decision details ---")
    print(f"Subject: {decision['email']['subject']}")
    print(f"From: {decision['email']['sender_name']} <{decision['email']['sender_email']}>")
    print(f"Assistant chose: {decision['result']['action']} (priority: {decision['result']['priority']})")
    print(f"Reasoning: {decision['result']['reasoning']}")
    if decision["result"].get("draft_reply"):
        print(f"\nDraft reply:\n{decision['result']['draft_reply']}")
    print()

    feedback = input("Your feedback (what should I learn from this?): ").strip()
    if not feedback:
        print("No feedback given, exiting.")
        return

    print("\nAsking Claude to propose a context update...")
    update = ask_claude_for_update(client, feedback, decision, snapshot_context())
    confirm_and_write(update)


def note_mode(client: anthropic.Anthropic, note: str) -> None:
    print("Asking Claude to incorporate your note into context...")
    update = ask_claude_for_update(client, note, None, snapshot_context())
    confirm_and_write(update)


def mark_task(task_id: str, status: str) -> int:
    """Mark a task as done or dismissed by ID (short prefix OK)."""
    all_tasks = tasks.load()
    matches = [t for t in all_tasks if t.id.startswith(task_id) and t.status == "open"]
    if not matches:
        print(f"No open task matched ID '{task_id}'.", file=sys.stderr)
        return 1
    if len(matches) > 1:
        print(
            f"Ambiguous — {len(matches)} open tasks start with '{task_id}':",
            file=sys.stderr,
        )
        for t in matches:
            print(f"  {t.id}  ({t.source_sender}) {t.text[:60]}", file=sys.stderr)
        return 1
    target = matches[0]
    if status == "done":
        tasks.mark_done(all_tasks, target.id)
        print(f"Marked done: {target.text}")
    else:
        tasks.mark_dismissed(all_tasks, target.id)
        print(f"Dismissed: {target.text}")
    tasks.save(all_tasks)
    return 0


def list_tasks() -> int:
    """Print all open tasks, oldest first."""
    all_tasks = tasks.load()
    open_list = tasks.open_tasks(all_tasks)
    if not open_list:
        print("No open tasks.")
        return 0
    print(f"{len(open_list)} open tasks:")
    for t in open_list:
        age = f"{t.age_days}d" if t.age_days > 0 else "new"
        seen = f" ({t.times_seen}×)" if t.times_seen > 1 else ""
        print(f"  {t.id}  [{t.priority}]  {age}{seen}  {t.source_sender}: {t.text}")
    return 0


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Teach the assistant from feedback.")
    parser.add_argument(
        "--note",
        type=str,
        default=None,
        help="Add a freeform note — Claude decides which context file to update.",
    )
    parser.add_argument(
        "--done",
        type=str,
        default=None,
        metavar="TASK_ID",
        help="Mark a task as done (short ID prefix from the briefing works).",
    )
    parser.add_argument(
        "--dismiss",
        type=str,
        default=None,
        metavar="TASK_ID",
        help="Dismiss a task without marking it done.",
    )
    parser.add_argument(
        "--tasks",
        action="store_true",
        help="List all open tasks and exit.",
    )
    args = parser.parse_args()

    if args.tasks:
        return list_tasks()
    if args.done:
        return mark_task(args.done, "done")
    if args.dismiss:
        return mark_task(args.dismiss, "dismissed")

    client = anthropic.Anthropic()
    if args.note:
        note_mode(client, args.note)
    else:
        interactive_mode(client)
    return 0


if __name__ == "__main__":
    sys.exit(main())
