# Build stage
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpq-dev libffi-dev curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies in a virtualenv or just normally in the builder
COPY shared /shared
RUN pip install --no-cache-dir /shared/adaptix_core

COPY services/auth/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final stage
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Copy only the installed packages from builder
COPY --from=builder /install /usr/local
COPY shared /shared
RUN pip install /shared/adaptix_core

# Copy application code
COPY services/auth .

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8000
CMD ["./docker-entrypoint.sh"]
