
import os

SERVICES_DIR = "/home/taposh/projects/adaptix-erp/adaptix/services"

# List of services to optimize (excluding customer which is already done)
SERVICES = [
    "accounting", "asset", "company", "hrms", "inventory", 
    "logistics", "manufacturing", "notification", "payment", 
    "pos", "product", "promotion", "purchase", "quality", "reporting"
]

# Intelligence requires build-essential, handle separately or use robust builder
INTELLIGENCE_SERVICE = "intelligence"

TEMPLATE = """# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Build wheels for Shared Core
COPY shared /shared
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels /shared/adaptix_core

# Build wheels for Service Requirements
COPY services/{service_name}/requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt


# Stage 2: Final
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install runtime dependencies only (libpq5 for Postgres)
RUN apt-get update && apt-get install -y \\
    libpq5 \\
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /wheels /wheels

# Install dependencies
RUN pip install --no-cache /wheels/*

# Copy Service Code
COPY services/{service_name} .

# Create a non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1"]
"""

INTELLIGENCE_TEMPLATE = """# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install build dependencies (build-essential for heavier libs)
RUN apt-get update && apt-get install -y \\
    build-essential \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Build wheels for Shared Core
COPY shared /shared
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels /shared/adaptix_core

# Build wheels for Service Requirements
COPY services/intelligence/requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt


# Stage 2: Final
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \\
    libpq5 \\
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /wheels /wheels

# Install dependencies
RUN pip install --no-cache /wheels/*

# Copy Service Code
COPY services/intelligence .

# Create a non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1"]
"""

def optimize_standard_services():
    for service in SERVICES:
        dockerfile_path = os.path.join(SERVICES_DIR, service, "Dockerfile")
        content = TEMPLATE.format(service_name=service)
        with open(dockerfile_path, "w") as f:
            f.write(content)
        print(f"Optimized {service}")

def optimize_intelligence():
    dockerfile_path = os.path.join(SERVICES_DIR, INTELLIGENCE_SERVICE, "Dockerfile")
    with open(dockerfile_path, "w") as f:
        f.write(INTELLIGENCE_TEMPLATE)
    print(f"Optimized {INTELLIGENCE_SERVICE}")

if __name__ == "__main__":
    optimize_standard_services()
    optimize_intelligence()
