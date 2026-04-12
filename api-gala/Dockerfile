FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_VIRTUALENVS_IN_PROJECT=false

WORKDIR /api_gala

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir --upgrade pip setuptools && \
    pip install --no-cache-dir poetry

COPY poetry.lock pyproject.toml ./

RUN poetry install --no-root

COPY . .

EXPOSE 8004
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004", "--reload"]
