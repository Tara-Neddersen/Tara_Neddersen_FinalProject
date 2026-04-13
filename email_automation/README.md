# Email Automation — Stanford Outlook triage with Claude

A small CLI that fetches your unread Stanford email, uses Claude to
summarize each message, extract action items, and draft reply text — then
optionally saves those drafts into your Outlook Drafts folder for you to
review and send manually.

**Nothing is ever auto-sent.** Replies go to Drafts only; you stay in the
loop.

> This directory is self-contained — it does not share any code, Docker
> images, or dependencies with the brain extraction pipeline in the rest of
> this repository.

## What it does

1. Authenticates to Stanford's Microsoft 365 tenant via a one-time device-code
   sign-in (token cached locally for future runs).
2. Pulls unread messages from your Inbox via Microsoft Graph.
3. Sends each message to Claude (`claude-opus-4-6`) with a system prompt
   describing Tara's role at the Knowles Lab. Claude returns a structured JSON
   payload: priority, summary, action items, and a draft reply.
4. Renders a markdown report — a prioritized to-do list plus per-message
   summaries with the proposed reply.
5. Optionally creates draft replies in Outlook, quoting the original thread.

## Setup

### 1. Register an Azure AD application (one-time, ~5 minutes)

Stanford's Microsoft tenant won't let arbitrary scripts read your mail —
you need to register an "app" that represents this tool.

1. Sign in to <https://portal.azure.com> with your Stanford account.
2. Go to **Microsoft Entra ID** → **App registrations** → **New registration**.
3. Fill in:
   - **Name:** `tara-email-triage` (or anything you like)
   - **Supported account types:** "Accounts in this organizational directory
     only (Stanford University only — Single tenant)"
   - **Redirect URI:** leave blank.
4. After registration, from the app's overview page, copy the
   **Application (client) ID** and **Directory (tenant) ID**.
5. Go to **Authentication** → tick **"Allow public client flows"** → Save.
6. Go to **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Delegated permissions** → add `Mail.Read` and `Mail.ReadWrite`. Click
   **Grant admin consent for Stanford University** (or ask your IT admin
   if you can't).

### 2. Get an Anthropic API key

Create one at <https://console.anthropic.com/>. Any tier works — this script
uses a small amount of tokens per email.

### 3. Configure

```bash
cd email_automation
cp .env.example .env
# edit .env, fill in MS_CLIENT_ID, MS_TENANT_ID, ANTHROPIC_API_KEY
```

### 4. First run

```bash
./run.sh
```

The first time, the wrapper creates a virtualenv and installs dependencies.
Then it prints a device code and URL:

```
To sign in, use a web browser to open the page https://microsoft.com/devicelogin
and enter the code A1B2C3D4E5 to authenticate.
```

Open that URL, sign in with your Stanford account, and approve the
permissions. The token is cached in `.token_cache.json` — you won't see
this prompt again until the refresh token expires (typically 90 days).

## Usage

```bash
# Default — triage 25 unread, write a markdown report, no drafts saved
./run.sh

# Also save draft replies to Outlook for urgent + high priority emails
./run.sh --drafts --min-priority high

# Process more mail
./run.sh --max 100

# Specific folder
./run.sh --folder "Archive"

# Custom report path
./run.sh --report ~/Desktop/today.md
```

The markdown report is written to `reports/triage_<timestamp>.md` and also
echoed to stdout.

## How drafts work

With `--drafts`, the script uses Graph's `createReply` endpoint. That creates
an Outlook draft with:

- To/Cc pre-filled from the original message
- Your proposed reply text at the top
- The original message quoted below a separator
- A small footer noting it was Claude-generated

To send, open Outlook (desktop/web/mobile), review the draft, edit if needed,
and hit send. Nothing leaves your account until you do.

## Priority levels

| Level     | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| `urgent`  | Deadline today/tomorrow, from PI/advisor, explicitly time-critical |
| `high`    | Meaningful action this week                                        |
| `normal`  | Routine but worth reading                                          |
| `low`     | Newsletters, mass announcements                                    |
| `skip`    | Spam / promotional                                                 |

`--min-priority` controls which of these get draft replies. Default is
`normal`, so `low` and `skip` never get a draft created even if Claude
generates one.

## Files

| Path               | What it does                                           |
| ------------------ | ------------------------------------------------------ |
| `triage.py`        | CLI entry point — argparse, orchestration, report render |
| `graph_auth.py`    | MSAL device-code auth + token cache                    |
| `graph_client.py`  | Microsoft Graph API wrapper (list unread, create drafts) |
| `claude_triage.py` | Claude Opus 4.6 triage with Pydantic structured outputs and prompt caching |
| `requirements.txt` | `msal`, `requests`, `anthropic`, `pydantic`, `python-dotenv` |
| `run.sh`           | venv + install + run convenience wrapper               |
| `.env.example`     | Template for configuration                             |

## Cost

Each email triage is a single Claude API call. The system prompt is cached
(prompt caching, ephemeral), so every call after the first in a run pays
roughly 0.1x for the shared prefix. A typical inbox of 25 unread emails costs
a few cents at most.

## Security notes

- `.env` and `.token_cache.json` are git-ignored. Do not commit them.
- The token cache holds a refresh token. On POSIX systems the script chmods
  it to 0600 on save.
- Claude only ever sees email content you've already fetched — nothing is
  stored on Anthropic's side beyond the API call itself.
- Drafts are never sent automatically.

## Troubleshooting

**"AADSTS700016: Application with identifier ... was not found":**
The client ID in `.env` doesn't match any app in the tenant. Double-check
you copied the right **Application (client) ID** and that `MS_TENANT_ID`
matches the directory where you registered it.

**"AADSTS65001: The user or administrator has not consented":**
Someone (you or admin) needs to click **Grant admin consent** on the API
permissions page.

**"AADSTS50020: User account ... is not authorized":**
You're signed into a personal Microsoft account. Use your Stanford account
(`@stanford.edu`).

**Claude errors with `InvalidRequestError`:**
Check `ANTHROPIC_API_KEY` is set and valid. If a specific email triggers
the error, check `reports/` — triage failures are logged per-email and
don't halt the batch.
