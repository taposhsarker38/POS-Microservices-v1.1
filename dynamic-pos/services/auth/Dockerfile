# FROM python:3.11-slim

# WORKDIR /app

# COPY requirements.txt /app/requirements.txt
# RUN apt-get update && apt-get install -y build-essential gcc libpq-dev && \
#     pip install --upgrade pip && pip install -r /app/requirements.txt

# COPY . /app

# ENV PYTHONUNBUFFERED=1

# # entrypoint handles migrations & superuser creation then exec gunicorn...
# ENTRYPOINT ["./docker-entrypoint.sh"]
# CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y build-essential libpq-dev libffi-dev curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . /app
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8000
CMD ["./docker-entrypoint.sh"]
