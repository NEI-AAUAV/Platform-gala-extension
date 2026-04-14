FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_CACHE_DIR=/var/cache/pypoetry

WORKDIR /api_gala

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir --upgrade pip setuptools && \
    pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock ./

# Regenerate lock if stale, then install all dependency groups
RUN poetry lock --no-update 2>/dev/null || poetry lock
RUN poetry install --no-root

COPY . .

EXPOSE 8004
ENV HOST=0.0.0.0
CMD python -m uvicorn app.main:app --host $HOST --port 8004
