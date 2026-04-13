"""Microsoft Graph authentication via MSAL device-code flow.

On first run, prints a device code and URL. Visit the URL, enter the code,
sign in with your Stanford account, and the token is cached for future runs.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import msal

SCOPES = ["Mail.Read", "Mail.ReadWrite"]
TOKEN_CACHE_PATH = Path(__file__).parent / ".token_cache.json"


def _load_cache() -> msal.SerializableTokenCache:
    cache = msal.SerializableTokenCache()
    if TOKEN_CACHE_PATH.exists():
        cache.deserialize(TOKEN_CACHE_PATH.read_text())
    return cache


def _save_cache(cache: msal.SerializableTokenCache) -> None:
    if cache.has_state_changed:
        TOKEN_CACHE_PATH.write_text(cache.serialize())
        # tighten permissions — the cache holds refresh tokens
        try:
            os.chmod(TOKEN_CACHE_PATH, 0o600)
        except OSError:
            pass


def get_access_token(client_id: str, tenant_id: str) -> str:
    """Return a valid Graph access token, prompting for device-code auth if needed."""
    cache = _load_cache()
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    app = msal.PublicClientApplication(
        client_id, authority=authority, token_cache=cache
    )

    # Try silent token acquisition first (using cached refresh token)
    accounts = app.get_accounts()
    result = None
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])

    if not result:
        # Fall back to device code flow
        flow = app.initiate_device_flow(scopes=SCOPES)
        if "user_code" not in flow:
            raise RuntimeError(
                "Failed to initiate device flow: "
                + json.dumps(flow, indent=2)
            )
        print(flow["message"], file=sys.stderr)
        sys.stderr.flush()
        result = app.acquire_token_by_device_flow(flow)

    _save_cache(cache)

    if "access_token" not in result:
        raise RuntimeError(
            f"Auth failed: {result.get('error')} - {result.get('error_description')}"
        )
    return result["access_token"]
