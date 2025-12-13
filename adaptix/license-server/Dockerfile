FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY license_server.py .

# Non-root user
RUN addgroup --system app && adduser --system --group app
USER app

EXPOSE 8500

CMD ["uvicorn", "license_server:app", "--host", "0.0.0.0", "--port", "8500"]
