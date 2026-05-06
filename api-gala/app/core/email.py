from typing import Any
import aiosmtplib
from email.utils import formatdate, make_msgid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
        return

    bodies = render_template(template, settings, **kwargs)

    message = MIMEMultipart("alternative")
    message["To"] = email
    message["From"] = settings.EMAIL_SENDER_ADDRESS
    message["Date"] = formatdate(localtime=True)
    message["Subject"] = subject
    message["Message-Id"] = make_msgid(domain=settings.EMAIL_DOMAIN)

    (html_content, text_content) = bodies
    message.attach(MIMEText(text_content))
    message.attach(MIMEText(html_content, "html"))

    await aiosmtplib.send(
        message,
        hostname=settings.EMAIL_SMTP_HOST,
        port=settings.EMAIL_SMTP_PORT,
        username=settings.EMAIL_SMTP_USER,
        password=settings.EMAIL_SMTP_PASSWORD,
    )
