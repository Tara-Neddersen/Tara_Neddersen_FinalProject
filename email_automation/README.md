# Email Automation — Stanford Outlook assistant with judgment, not rules

A CLI that reads your unread Stanford email, reasons about each message
using your personal context (not a rulebook), and either:

- flags it as something only you should handle,
- writes a draft reply in your voice and saves it to Outlook Drafts for
  review,
- notes it as FYI, or
- ignores it as noise.

Every decision is logged with the assistant's reasoning. You can give
feedback on any decision — "that was wrong, here's why" — and the
assistant updates its understanding of you, so it gets better over time.

**Nothing is ever auto-sent.** Drafts go to your Outlook Drafts folder;
you review and send manually. Trust has to be earned.

## The design: context, not rules

Most email automations ask you to write rules ("auto-decline Fridays,
auto-accept anything from X, if subject contains Y then Z"). Those rules
are brittle and you have to maintain them.

This one is different. You write a `context/about_me.md` in plain English
— the way you'd describe yourself to a new executive assistant on day
one. You describe how you talk, who matters to you, what you're going
through right now, how you want to be protected. The assistant reads
that every run and reasons from it.

When it makes a decision you don't like, you tell it why, and it
*updates your context file* based on your feedback. You never edit a
rulebook.

## What's in `context/`

| File | What it holds |
| --- | --- |
| `context/about_me.md` | Who you are, how you talk, your priorities, your limits. Long-lived. |
| `context/current_state.md` | What's going on this week. Your energy level. What you're protecting. Short-lived, update often. |
| `context/people/<email>.md` | Optional per-person notes. Create one for anyone whose email has a different shape than the default (advisor, close collaborators). |

Edit these as prose, not as lists of rules. The assistant does better with
"Prof. Knowles is my advisor and I never flatly say no to her — I always
propose alternatives" than with "IF sender == knowles THEN action =
always_accept."

## Setup

### 1. Register an Azure AD application (one-time, ~5 minutes)

Stanford's Microsoft tenant won't let arbitrary scripts read your mail —
you need to register an "app" that represents this tool.

1. Sign in to <https://portal.azure.com> with your Stanford account.
2. **Microsoft Entra ID** → **App registrations** → **New registration**.
3. Name: `tara-email-assistant`. Account type: single tenant (Stanford).
   Redirect URI: blank.
4. Copy the **Application (client) ID** and **Directory (tenant) ID** from
   the app's overview page.
5. **Authentication** → tick **"Allow public client flows"** → Save.
6. **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Delegated permissions** → add `Mail.Read` and `Mail.ReadWrite`. Click
   **Grant admin consent for Stanford University** (or ask your IT admin).

### 2. Anthropic API key

Create one at <https://console.anthropic.com/>.

### 3. Configure

```bash
cd email_automation
cp .env.example .env
# edit .env, fill in MS_CLIENT_ID, MS_TENANT_ID, ANTHROPIC_API_KEY
```

### 4. Personalize your context

Open `context/about_me.md` and edit it. The existing file is a template
filled in with what Claude knows about you from this setup — update it
with your own voice.

Then open `context/current_state.md` and describe what's going on this
week.

If there are specific people whose email deserves special handling (your
advisor, close collaborators), create `context/people/<their-email>.md`.
See `context/people/README.md` for the template.

### 5. First run

```bash
./run.sh
```

First time: the wrapper creates a venv and installs dependencies. Then it
prints a device code and URL:

```
To sign in, use a web browser to open the page https://microsoft.com/devicelogin
and enter the code A1B2C3D4E5 to authenticate.
```

Open that URL, sign in with Stanford, approve the permissions. The token
is cached in `.token_cache.json` — you won't see this prompt again until
the refresh token expires (~90 days).

## Daily usage

```bash
# Triage your inbox, save drafts to Outlook, write a briefing
./run.sh

# Triage only, no Outlook writes (for when you want to see the reasoning before trusting)
./run.sh --no-drafts

# Process more mail
./run.sh --max 100

# Give feedback on a recent decision
./venv/bin/python feedback.py

# Add a freeform note — Claude decides which context file to update
./venv/bin/python feedback.py --note "Starting this week I'm protecting Monday mornings for writing."
```

## How the feedback loop works

1. The assistant triages an email and logs its decision + reasoning to
   `decisions/`.
2. You notice in the briefing: "This reply is too formal — Sarah and I are
   friends, not strangers."
3. Run `python feedback.py`, pick that decision, say what was wrong.
4. Claude proposes an update to `context/people/sarah@example.com.md` (or
   creates it if it doesn't exist) — "Sarah is a close collaborator; tone
   with her should be casual, first-name only, can skip formal greetings."
5. You approve the diff. Next time Sarah emails, the assistant reads that
   note and adjusts.

You never write a rule. You just tell it what you meant, and it learns.

## The actions Claude can pick

| Action | What happens |
| --- | --- |
| `draft_for_review` | Claude writes a draft reply, saves it to your Outlook Drafts folder. You open Outlook, review, send. (Default for most mail.) |
| `flag_urgent` | Surfaces in the "Needs you" section of the briefing. No draft — you'll want to handle this personally. |
| `fyi_only` | Mentioned in the briefing so you know, but no draft and no action required. |
| `ignore` | Doesn't surface in the briefing beyond a one-line "noise" roll-up. Newsletters, spam, automated notifications. |

## Files

| Path | What it does |
| --- | --- |
| `triage.py` | Main CLI — fetches unread, runs triage, writes briefing, saves drafts, logs decisions |
| `feedback.py` | Interactive feedback — updates your context files from plain-English feedback |
| `graph_auth.py` | MSAL device-code auth + token cache |
| `graph_client.py` | Microsoft Graph API wrapper |
| `claude_triage.py` | Claude reasoning engine — reads context, produces structured decisions |
| `context/about_me.md` | Your long-lived self-description (edit this!) |
| `context/current_state.md` | What's going on for you right now |
| `context/people/` | Optional per-person notes |
| `decisions/` | Log of every decision the assistant made (git-ignored) |
| `reports/` | Generated briefings (git-ignored) |

## Cost

Claude Opus 4.6 with adaptive thinking + prompt caching on your context.
Context is cached across a run, so every email after the first costs ~0.1x
for the shared prefix. A typical inbox of 25 unread emails costs a few
cents.

## Security notes

- `.env`, `.token_cache.json`, `decisions/`, `reports/` are all git-ignored.
- The token cache holds a refresh token. On POSIX the script chmods it
  to 0600.
- Nothing is ever auto-sent. Drafts require manual send from Outlook.
- Claude sees email content you've fetched; Anthropic doesn't retain it
  beyond the API call.

## Principles

- **No rules you have to maintain.** Context + judgment.
- **Nothing auto-sends.** You always review.
- **Every decision logs its reasoning.** So you know what the assistant
  was thinking.
- **Feedback updates context, not rules.** The system gets smarter from
  your natural language, not from you writing `if/then` clauses.
- **Designed for burnt-out use.** Default is conservative — draft
  everything for review. Auto-handling has to be earned over time.
