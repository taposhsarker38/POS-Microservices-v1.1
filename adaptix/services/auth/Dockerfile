FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE 1

RUN apt-get update && \
    apt-get install -y build-essential libpq-dev libffi-dev curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Shared Core
COPY shared /shared
RUN pip install /shared/adaptix_core

# Copy Service Requirements
COPY services/auth/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy Service Code
COPY services/auth .

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8000
CMD ["./docker-entrypoint.sh"]
