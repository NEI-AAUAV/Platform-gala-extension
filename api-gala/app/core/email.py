from typing import Any
import aiosmtplib
from ssl import create_default_context
from email.utils import formatdate, make_msgid
from email.message import EmailMessage
from jinja2 import Environment, select_autoescape, FileSystemLoader

from app.core.logging import logger
from app.core.config import Settings

_env: Environment


def init_emails(settings: Settings) -> None:
    if settings.EMAIL_ENABLED:
        logger.info("Email is enabled")
        global _env
        _env = Environment(
            loader=FileSystemLoader("templates"),
            autoescape=select_autoescape(["html", "xml"]),
        )
    else:
        logger.warning("Email is disabled")


def render_template(
    template: str, settings: Settings, **kwargs: Any
) -> tuple[str, str]:
    global _env
    _html_template = _env.get_template(f"{template}.html")
    _txt_template = _env.get_template(f"{template}.txt")

    kwargs["PUBLIC_URL"] = settings.HOST
    return (
        _html_template.render(kwargs),
        _txt_template.render(kwargs),
    )


async def send_email(
    email: str,
    subject: str,
    *,
    settings: Settings,
    template: str,
    **kwargs: Any,
) -> None:
    if not settings.EMAIL_ENABLED:
        logger.debug("Email send skipped because EMAIL_ENABLED is false")
        return

    if not settings.EMAIL_SMTP_HOST or not settings.EMAIL_SENDER_ADDRESS:
        logger.error("Email is enabled but SMTP host or sender address is missing")
        return

    logger.info(
        "Preparing email send to {} using host={} port={} user={} sender={} template={}",
        email,
        settings.EMAIL_SMTP_HOST,
        settings.EMAIL_SMTP_PORT,
        settings.EMAIL_SMTP_USER or "<empty>",
        settings.EMAIL_SENDER_ADDRESS,
        template,
    )

    bodies = render_template(template, settings, **kwargs)

    html_content, text_content = bodies
    logger.debug(
        "Rendered email bodies for {}: html_chars={} text_chars={}",
        email,
        len(html_content),
        len(text_content),
    )

    message = EmailMessage()
    message["To"] = email
    message["From"] = settings.EMAIL_SENDER_ADDRESS
    message["Date"] = formatdate(localtime=True)
    message["Subject"] = subject
    message["Message-Id"] = make_msgid(domain=settings.EMAIL_DOMAIN)
    message.set_content(text_content, subtype="plain", charset="utf-8")
    message.add_alternative(html_content, subtype="html", charset="utf-8")
    message["X-Mailer"] = "NEI Gala API"

    smtp = aiosmtplib.SMTP(
        hostname=settings.EMAIL_SMTP_HOST,
        port=settings.EMAIL_SMTP_PORT,
        timeout=20,
        start_tls=True,
        tls_context=create_default_context(),
    )

    try:
        logger.debug("Connecting to SMTP server")
        await smtp.connect()
        logger.debug("SMTP connected")
        if settings.EMAIL_SMTP_USER and settings.EMAIL_SMTP_PASSWORD:
            logger.debug("Logging into SMTP server as {}", settings.EMAIL_SMTP_USER)
            await smtp.login(settings.EMAIL_SMTP_USER, settings.EMAIL_SMTP_PASSWORD)
            logger.debug("SMTP login successful")
        else:
            logger.warning("SMTP credentials are incomplete; attempting send without login")

        logger.debug("Sending message to {}", email)
        await smtp.send_message(message)
        logger.info("Email sent to {}", email)
    except Exception:
        logger.exception(
            "Failed to send email to {} with host={} port={} user={}",
            email,
            settings.EMAIL_SMTP_HOST,
            settings.EMAIL_SMTP_PORT,
            settings.EMAIL_SMTP_USER or "<empty>",
        )
        raise
    finally:
        try:
            await smtp.quit()
        except Exception:
            logger.debug("SMTP quit failed or connection was never established")
