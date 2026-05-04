from dataclasses import dataclass
from typing import List, Optional
import httpx

from app.core.config import Settings


@dataclass(frozen=True)
class AuthentikUser:
    pk: int
    name: str
    email: str


async def fetch_group_members(settings: Settings, group_name: str) -> List[AuthentikUser]:
    if not settings.AUTHENTIK_URL or not settings.AUTHENTIK_TOKEN:
        return []

    headers = {"Authorization": f"Bearer {settings.AUTHENTIK_TOKEN}"}
    url = f"{settings.AUTHENTIK_URL}/api/v3/core/groups/"
    params = {"name": group_name, "include_users": "true"}
    verify_ssl = settings.PRODUCTION

    async with httpx.AsyncClient(verify=verify_ssl) as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()

    results = resp.json().get("results", [])
    if not results:
        return []

    return [
        AuthentikUser(pk=u["pk"], name=u.get("name", ""), email=u.get("email", ""))
        for u in results[0].get("users_obj", [])
    ]


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
            while url:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                for u in data.get("results", []):
                    users.append(
                        AuthentikUser(pk=u["pk"], name=u.get("name", ""), email=u.get("email", ""))
                    )
                
                # Check for pagination in Authentik's format
                pagination = data.get("pagination", {})
                next_page = pagination.get("next")
                
                # Some versions might return standard DRF next URL string
                next_url_str = data.get("next")
                
                if isinstance(next_url_str, str) and next_url_str.startswith("http"):
                    url = next_url_str
                    params = {}
                elif isinstance(next_page, int) and next_page > 0:
                    params["page"] = next_page
                else:
                    break
        except Exception as e:
            print(f"Error fetching Authentik users: {e}")
            # Return whatever users we managed to fetch before the error
            pass

    return users


async def sync_email_based_registrations(db, authentik_user_id: int, email: str) -> None:
    """Called when a user logs in. If there's an admin-created registration with the same
    email, it is re-linked to the real Authentik user ID. Similarly, if the user is listed
    as a companion_email on another registration, a note is stored for display.
    """
    from app.models.user import User

    user_coll = User.get_collection(db)
    email_lower = email.strip().lower()

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
            except Exception:
                pass  # If the real user doc already exists somehow, skip silently

    # Case 2: User is a companion in someone else's registration
    # I should find registrations where `companions.email` == email_lower
    host = await user_coll.find_one({
        "companions.email": email_lower,
        "is_registered": True
    })
    
    if host:
        real_existing = await user_coll.find_one({"_id": authentik_user_id, "is_registered": True})
        if not real_existing:
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
                        "email": email,
                        "nmec": 0,
                        "name": "",
                        "registration_step": 6
                    }
                },
                upsert=True
            )

