from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers


def _upload_file() -> UploadFile:
    return UploadFile(
        filename="proof.pdf",
        file=BytesIO(b"proof"),
        headers=Headers({"content-type": "application/pdf"}),
    )


def _config():
    from app.models.config import GlobalConfig, PriceConfig

    return GlobalConfig(
        payment_deadline_date="2026-06-30",
        prices=PriceConfig(
            phased_payment_enabled=True,
            phase1_deadline="2026-05-10",
            phase2_deadline="2026-07-10",
        ),
    )


def _auth():
    from app.api.auth import AuthData

    return AuthData(
        sub=1,
        nmec=12345,
        name="Test",
        surname="User",
        email="test@ua.pt",
        scopes=["default"],
    )


@pytest.mark.asyncio
async def test_upload_payment_proof_explicit_integral_uses_global_payment_deadline():
    from app.api.registration import upload_payment_proof
    from app.models.user import User

    db = MagicMock()
    user = User.parse_obj(
        {
            "_id": 1,
            "nmec": 12345,
            "email": "test@ua.pt",
            "name": "Test User",
            "phased_payment": True,
        }
    )

    with patch("app.api.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=_config()), \
         patch("app.api.registration.RegistrationService.get_user_registration", new_callable=AsyncMock, return_value=user), \
         patch("app.api.registration.storage_client") as storage_client, \
         patch("app.api.registration.is_deadline_passed", return_value=False) as deadline_passed, \
         patch("app.api.registration.RegistrationService.upload_payment_proof", new_callable=AsyncMock, return_value="https://proof"):
        storage_client.enabled = True

        response = await upload_payment_proof(
            db=db,
            auth=_auth(),
            file=_upload_file(),
            phase=1,
            phased_payment=False,
        )

    assert response == {"url": "https://proof"}
    deadline_passed.assert_called_once_with("2026-06-30")


@pytest.mark.asyncio
async def test_upload_payment_proof_legacy_request_uses_saved_phased_payment_choice():
    from app.api.registration import upload_payment_proof
    from app.models.user import User

    db = MagicMock()
    user = User.parse_obj(
        {
            "_id": 1,
            "nmec": 12345,
            "email": "test@ua.pt",
            "name": "Test User",
            "phased_payment": True,
        }
    )

    with patch("app.api.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=_config()), \
         patch("app.api.registration.RegistrationService.get_user_registration", new_callable=AsyncMock, return_value=user), \
         patch("app.api.registration.storage_client") as storage_client, \
         patch("app.api.registration.is_deadline_passed", return_value=False) as deadline_passed, \
         patch("app.api.registration.RegistrationService.upload_payment_proof", new_callable=AsyncMock, return_value="https://proof"):
        storage_client.enabled = True

        response = await upload_payment_proof(
            db=db,
            auth=_auth(),
            file=_upload_file(),
            phase=1,
        )

    assert response == {"url": "https://proof"}
    deadline_passed.assert_called_once_with("2026-05-10")


@pytest.mark.asyncio
async def test_upload_payment_proof_integral_after_phase1_deadline_is_allowed_until_payment_deadline():
    from app.api.registration import upload_payment_proof
    from app.models.user import User

    db = MagicMock()
    user = User.parse_obj(
        {
            "_id": 1,
            "nmec": 12345,
            "email": "test@ua.pt",
            "name": "Test User",
            "phased_payment": False,
        }
    )

    def fake_deadline_passed(deadline: str) -> bool:
        return deadline == "2026-05-10"

    with patch("app.api.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=_config()), \
         patch("app.api.registration.RegistrationService.get_user_registration", new_callable=AsyncMock, return_value=user), \
         patch("app.api.registration.storage_client") as storage_client, \
         patch("app.api.registration.is_deadline_passed", side_effect=fake_deadline_passed) as deadline_passed, \
         patch("app.api.registration.RegistrationService.upload_payment_proof", new_callable=AsyncMock, return_value="https://proof"):
        storage_client.enabled = True

        response = await upload_payment_proof(
            db=db,
            auth=_auth(),
            file=_upload_file(),
            phase=1,
        )

    assert response == {"url": "https://proof"}
    deadline_passed.assert_called_once_with("2026-06-30")


@pytest.mark.asyncio
async def test_upload_payment_proof_phased_after_phase1_deadline_is_rejected():
    from app.api.registration import upload_payment_proof

    db = MagicMock()

    with patch("app.api.registration.ConfigService.get_config", new_callable=AsyncMock, return_value=_config()), \
         patch("app.api.registration.RegistrationService.get_user_registration", new_callable=AsyncMock, return_value=None), \
         patch("app.api.registration.storage_client") as storage_client, \
         patch("app.api.registration.is_deadline_passed", return_value=True) as deadline_passed, \
         patch("app.api.registration.RegistrationService.upload_payment_proof", new_callable=AsyncMock) as upload:
        storage_client.enabled = True

        with pytest.raises(HTTPException) as exc_info:
            await upload_payment_proof(
                db=db,
                auth=_auth(),
                file=_upload_file(),
                phase=1,
                phased_payment=True,
            )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "O prazo para envio do comprovativo já passou."
    deadline_passed.assert_called_once_with("2026-05-10")
    upload.assert_not_called()
