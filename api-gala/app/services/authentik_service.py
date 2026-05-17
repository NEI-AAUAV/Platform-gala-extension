from dataclasses import dataclass
import re
from typing import List, Optional
import httpx

from app.core.config import Settings
from app.core.logging import logger


@dataclass(frozen=True)
class AuthentikUser:
    pk: int
    name: str
    email: str


def _users_from_results(results: list[dict]) -> list[AuthentikUser]:
    return [
        AuthentikUser(pk=u["pk"], name=u.get("name", ""), email=u.get("email", ""))
        for u in results
    ]


def _apply_next_page(data: dict, params: dict, current_url: str) -> tuple[str, bool]:
    pagination = data.get("pagination", {})
    next_page = pagination.get("next")
    next_url_str = data.get("next")

    if isinstance(next_url_str, str) and next_url_str.startswith("http"):
        params.clear()
        return next_url_str, True

    if isinstance(next_page, int) and next_page > 0:
        params["page"] = next_page
        return current_url, True

    return current_url, False


def _filter_users_by_search(users: list[AuthentikUser], search: Optional[str]) -> list[AuthentikUser]:
    if not search:
        return users
    s = search.strip().lower()
    return [
        u
        for u in users
        if s in (u.name or "").lower() or s in (u.email or "").lower()
    ]


def _dedupe_users(users: list[AuthentikUser]) -> list[AuthentikUser]:
    return list({u.pk: u for u in users}.values())


async def fetch_group_members(settings: Settings, group_name: str) -> List[AuthentikUser]:
    if not settings.AUTHENTIK_URL or not settings.AUTHENTIK_TOKEN:
        return []

    headers = {"Authorization": f"Bearer {settings.AUTHENTIK_TOKEN}"}
    verify_ssl = settings.PRODUCTION

    async with httpx.AsyncClient(verify=verify_ssl) as client:
        # Strategy 1: Fetch users directly by group filter (requires view_user permission)
        try:
            users_url = f"{settings.AUTHENTIK_URL}/api/v3/core/users/"
            users_resp = await client.get(
                users_url,
                params={"groups_by_name": group_name},
                headers=headers,
            )
            if users_resp.status_code < 400:
                return [
                    AuthentikUser(pk=u["pk"], name=u.get("name", ""), email=u.get("email", ""))
                    for u in users_resp.json().get("results", [])
                ]
            else:
                print(f"Authentik users API returned {users_resp.status_code}: {users_resp.text}")
        except Exception as e:
            print(f"Error calling Authentik users API: {e}")

        # Strategy 2: Fetch group and its members (requires view_group permission)
        try:
            groups_url = f"{settings.AUTHENTIK_URL}/api/v3/core/groups/"
            groups_resp = await client.get(
                groups_url,
                params={"search": group_name, "include_users": "true"},
                headers=headers,
            )
            if groups_resp.status_code < 400:
                data = groups_resp.json()
                results = [
                    g for g in data.get("results", [])
                    if g.get("name") == group_name
                ]
                if results:
                    users_obj = results[0].get("users_obj") or []
                    return [
                        AuthentikUser(pk=u["pk"], name=u.get("name", ""), email=u.get("email", ""))
                        for u in users_obj
                    ]
            else:
                print(f"Authentik groups API returned {groups_resp.status_code}: {groups_resp.text}")
        except Exception as e:
            print(f"Error calling Authentik groups API: {e}")

    return []


async def fetch_all_users(settings: Settings, search: Optional[str] = None) -> List[AuthentikUser]:
    """Fetches all users from Authentik (paginated). Used by admin to search for users."""
    if not settings.AUTHENTIK_URL or not settings.AUTHENTIK_TOKEN:
        return []

    headers = {"Authorization": f"Bearer {settings.AUTHENTIK_TOKEN}"}
    verify_ssl = settings.PRODUCTION
    users: List[AuthentikUser] = []
    url = f"{settings.AUTHENTIK_URL}/api/v3/core/users/"
    params: dict = {}
    if search:
        params["search"] = search

    async with httpx.AsyncClient(verify=verify_ssl) as client:
        try:
            has_next = True
            while has_next:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                users.extend(_users_from_results(data.get("results", [])))
                url, has_next = _apply_next_page(data, params, url)
        except Exception as e:
            logger.warning("Error fetching Authentik users via /core/users: {}", e)
            # Fallback: try manager group members (works with narrower permissions in some setups)
            fallback_users = await fetch_group_members(
                settings, settings.AUTHENTIK_MANAGER_GALA_GROUP
            )
            fallback_users = _filter_users_by_search(fallback_users, search)
            return _dedupe_users([*users, *fallback_users])

    return _dedupe_users(users)


async def fetch_user_by_id(settings: Settings, user_id: int) -> Optional[AuthentikUser]:
    """Fetches a single user from Authentik by their PK."""
    if not settings.AUTHENTIK_URL or not settings.AUTHENTIK_TOKEN:
        return None

    headers = {"Authorization": f"Bearer {settings.AUTHENTIK_TOKEN}"}
    verify_ssl = settings.PRODUCTION
    url = f"{settings.AUTHENTIK_URL}/api/v3/core/users/{user_id}/"

    async with httpx.AsyncClient(verify=verify_ssl) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            u = resp.json()
            return AuthentikUser(pk=u["pk"], name=u.get("name", ""), email=u.get("email", ""))
        except Exception as e:
            print(f"Error fetching Authentik user {user_id}: {e}")
            return None


async def sync_email_based_registrations(db, authentik_user_id: int, email: str) -> None:
    """Called when a user logs in. If there's an admin-created registration with the same
    email, it is re-linked to the real Authentik user ID. Similarly, if the user is listed
    as a companion_email on another registration, a note is stored for display.
    """
    from app.models.user import User

    user_coll = User.get_collection(db)
    email_normalized = email.strip()
    email_lower = email_normalized.lower()

    # Case 1: admin created a registration with this email (no real account)
    phantom = await user_coll.find_one(
        {"email": email_lower, "admin_created": True, "is_registered": True}
    )
    if phantom:
        phantom_id = phantom["_id"]
        # Check if the real account already has a registration
        real_existing = await user_coll.find_one({"_id": authentik_user_id, "is_registered": True})
        if not real_existing:
            # Transfer: update the phantom doc's _id to the real Authentik ID
            # MongoDB doesn't support _id updates, so we copy-and-delete
            new_doc = {**phantom, "_id": authentik_user_id, "admin_created": False}
            try:
                await user_coll.replace_one({"_id": authentik_user_id}, new_doc, upsert=True)
                await user_coll.delete_one({"_id": phantom_id})
                logger.info(
                    "Transferred phantom registration {} → {} ({})",
                    phantom_id, authentik_user_id, email,
                )
            except Exception as e:
                logger.error(
                    "Failed to transfer phantom registration {} → {} ({}): {}",
                    phantom_id, authentik_user_id, email, e,
                )

    # Case 2: User is a companion in someone else's registration
    # I should find registrations where `companions.email` == email_lower
    # Be tolerant with casing/whitespace differences from previously saved companion emails.
    email_pattern = re.escape(email_normalized)
    host = await user_coll.find_one(
        {
            "is_registered": True,
            "companions.email": {
                "$regex": rf"^\s*{email_pattern}\s*$",
                "$options": "i",
            },
        }
    )
    
    if host:
        real_existing = await user_coll.find_one({"_id": authentik_user_id, "is_registered": True})
        if not real_existing:
            # Re-fetch to guard against the host removing the companion between the two queries
            host_still_valid = await user_coll.find_one(
                {
                    "_id": host["_id"],
                    "is_registered": True,
                    "companions.email": {
                        "$regex": rf"^\s*{email_pattern}\s*$",
                        "$options": "i",
                    },
                }
            )
            if not host_still_valid:
                return
            update_data = {
                "is_registered": True,
                "is_companion_of": host["_id"],
                "has_payed": host.get("has_payed", False),
                "table_id": host.get("table_id")
            }
            await user_coll.update_one(
                {"_id": authentik_user_id},
                {
                    "$set": update_data,
                    "$setOnInsert": {
                        "email": email_normalized,
                        "nmec": 0,
                        "name": "",
                        "registration_step": 6
                    }
                },
                upsert=True
            )
