FROM python:3.12-slim

# install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

COPY pyproject.toml ./
RUN uv sync --no-dev --no-install-project

COPY . .

EXPOSE 8000

# Shell form so $PORT expands: PaaS hosts (Railway, Render, Fly) assign the port at runtime and
# health-check it. Binding a hardcoded 8000 there makes the deploy look dead. Defaults to 8000 locally.
CMD ["sh", "-c", "uv run uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
