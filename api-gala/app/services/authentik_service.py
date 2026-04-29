from dataclasses import dataclass
from typing import List
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
