"""Microsoft Graph API client — minimal wrapper for Outlook mail operations."""
from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


@dataclass
class EmailMessage:
    id: str
    subject: str
    sender_name: str
    sender_email: str
    received: str
    body_text: str
    conversation_id: str
    web_link: str


@dataclass
class CalendarEvent:
    subject: str
    start: str  # ISO8601
    end: str  # ISO8601
    is_all_day: bool
    show_as: str  # free, tentative, busy, oof, workingElsewhere, unknown
    organizer_name: str
    organizer_email: str
    location: str
    is_online: bool
    attendees: list[str] = field(default_factory=list)


@dataclass
class ThreadMessage:
    """A single message inside a conversation thread, stripped for LLM consumption."""

    sender_name: str
    sender_email: str
    sent_at: str
    body_text: str
    is_from_me: bool


class GraphClient:
    def __init__(self, access_token: str) -> None:
        self._token = access_token
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            }
        )
        self._user_email_cache: str | None = None

    def _get(self, path: str, **params: Any) -> dict:
        r = self._session.get(f"{GRAPH_BASE}{path}", params=params, timeout=30)
        r.raise_for_status()
        return r.json()

    def _post(self, path: str, json_body: dict) -> dict:
        r = self._session.post(
            f"{GRAPH_BASE}{path}", json=json_body, timeout=30
        )
        r.raise_for_status()
        # POST /createReply returns the draft message; /reply returns 202 with empty body
        if r.status_code == 202 or not r.content:
            return {}
        return r.json()

    def _patch(self, path: str, json_body: dict) -> dict:
        r = self._session.patch(
            f"{GRAPH_BASE}{path}", json=json_body, timeout=30
        )
        r.raise_for_status()
        if not r.content:
            return {}
        return r.json()

    def list_unread(
        self, folder: str = "Inbox", top: int = 25
    ) -> list[EmailMessage]:
        """List unread messages in a folder, newest first."""
        data = self._get(
            f"/me/mailFolders/{folder}/messages",
            **{
                "$filter": "isRead eq false",
                "$orderby": "receivedDateTime desc",
                "$top": top,
                "$select": (
                    "id,subject,from,receivedDateTime,body,"
                    "bodyPreview,conversationId,webLink"
                ),
            },
        )
        messages = []
        for m in data.get("value", []):
            from_field = (m.get("from") or {}).get("emailAddress") or {}
            body = m.get("body") or {}
            messages.append(
                EmailMessage(
                    id=m["id"],
                    subject=m.get("subject", "") or "(no subject)",
                    sender_name=from_field.get("name", "") or "",
                    sender_email=from_field.get("address", "") or "",
                    received=m.get("receivedDateTime", "") or "",
                    body_text=_strip_html(
                        body.get("content", ""),
                        content_type=body.get("contentType", "text"),
                    ),
                    conversation_id=m.get("conversationId", "") or "",
                    web_link=m.get("webLink", "") or "",
                )
            )
        return messages

    def get_user_email(self) -> str:
        """Return the signed-in user's primary email address (cached after first call)."""
        if self._user_email_cache is None:
            data = self._get("/me", **{"$select": "mail,userPrincipalName"})
            self._user_email_cache = (
                data.get("mail") or data.get("userPrincipalName") or ""
            ).lower()
        return self._user_email_cache

    def get_upcoming_events(
        self, days_ahead: int = 7, max_events: int = 50
    ) -> list[CalendarEvent]:
        """Return events on the user's calendar from now through `days_ahead` days.

        Uses calendarView, which expands recurring series into concrete instances
        — exactly what we want for scheduling context.
        """
        now = datetime.now(timezone.utc)
        end = now + timedelta(days=days_ahead)
        data = self._get(
            "/me/calendarView",
            **{
                "startDateTime": now.isoformat(),
                "endDateTime": end.isoformat(),
                "$orderby": "start/dateTime",
                "$top": max_events,
                "$select": (
                    "subject,start,end,isAllDay,showAs,organizer,"
                    "location,isOnlineMeeting,attendees"
                ),
            },
        )
        events: list[CalendarEvent] = []
        for e in data.get("value", []):
            organizer = (e.get("organizer") or {}).get("emailAddress") or {}
            location = (e.get("location") or {}).get("displayName", "") or ""
            attendees = []
            for a in e.get("attendees", []) or []:
                ea = (a.get("emailAddress") or {})
                name = ea.get("name") or ea.get("address") or ""
                if name:
                    attendees.append(name)
            events.append(
                CalendarEvent(
                    subject=e.get("subject", "") or "(no subject)",
                    start=(e.get("start") or {}).get("dateTime", ""),
                    end=(e.get("end") or {}).get("dateTime", ""),
                    is_all_day=bool(e.get("isAllDay")),
                    show_as=e.get("showAs", "busy") or "busy",
                    organizer_name=organizer.get("name", "") or "",
                    organizer_email=organizer.get("address", "") or "",
                    location=location,
                    is_online=bool(e.get("isOnlineMeeting")),
                    attendees=attendees[:8],  # cap to avoid token bloat
                )
            )
        return events

    def get_conversation_thread(
        self,
        conversation_id: str,
        exclude_message_id: str | None = None,
        limit: int = 15,
    ) -> list[ThreadMessage]:
        """Return prior messages in a conversation, oldest first.

        Excludes the one you pass as `exclude_message_id` (typically the email
        you're currently triaging). Useful for giving the LLM thread context.
        """
        if not conversation_id:
            return []
        # Graph's $filter for conversationId escapes single quotes by doubling them.
        safe_cid = conversation_id.replace("'", "''")
        try:
            data = self._get(
                "/me/messages",
                **{
                    "$filter": f"conversationId eq '{safe_cid}'",
                    "$orderby": "receivedDateTime asc",
                    "$top": limit,
                    "$select": (
                        "id,from,receivedDateTime,sentDateTime,body,bodyPreview"
                    ),
                },
            )
        except requests.HTTPError:
            # Thread fetch is optional — if it fails we just proceed without it
            return []

        me = self.get_user_email()
        messages: list[ThreadMessage] = []
        for m in data.get("value", []) or []:
            if exclude_message_id and m.get("id") == exclude_message_id:
                continue
            from_field = (m.get("from") or {}).get("emailAddress") or {}
            sender_email = (from_field.get("address") or "").lower()
            body = m.get("body") or {}
            text = _strip_html(
                body.get("content", ""),
                content_type=body.get("contentType", "text"),
            )
            # Truncate each message — threads can pile up quickly
            if len(text) > 2000:
                text = text[:2000] + " [...]"
            messages.append(
                ThreadMessage(
                    sender_name=from_field.get("name", "") or "",
                    sender_email=sender_email,
                    sent_at=m.get("sentDateTime") or m.get("receivedDateTime", ""),
                    body_text=text,
                    is_from_me=bool(me and sender_email == me),
                )
            )
        return messages

    def create_reply_draft(self, message_id: str, reply_body_text: str) -> str:
        """Create a reply draft in Outlook and set its body. Returns draft ID.

        This saves a draft but does NOT send it — the user reviews in Outlook.
        """
        # createReply makes a draft pre-populated with quoted thread + recipients
        draft = self._post(f"/me/messages/{message_id}/createReply", {})
        draft_id = draft["id"]

        # Update body: prepend our proposed reply above the quoted original.
        # Graph returns the draft with the quoted original already in body.content;
        # we prepend the reply text as plain HTML-escaped content.
        original_body = (draft.get("body") or {}).get("content", "")
        escaped = html.escape(reply_body_text).replace("\n", "<br>")
        new_body = (
            f"<div>{escaped}</div>"
            f'<div style="color:#888;font-size:smaller;margin-top:1em;">'
            f"[Draft generated by email_automation — review before sending]</div>"
            f"<hr>{original_body}"
        )
        self._patch(
            f"/me/messages/{draft_id}",
            {"body": {"contentType": "html", "content": new_body}},
        )
        return draft_id


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t\u00a0]+")
_NL_RE = re.compile(r"\n{3,}")


def _strip_html(content: str, content_type: str = "text") -> str:
    """Convert HTML email body to readable plain text (good enough for the LLM)."""
    if not content:
        return ""
    if content_type.lower() == "text":
        return content.strip()
    # naive but serviceable: drop tags, unescape entities, collapse whitespace
    text = _TAG_RE.sub("\n", content)
    text = html.unescape(text)
    text = _WS_RE.sub(" ", text)
    text = _NL_RE.sub("\n\n", text)
    return text.strip()
