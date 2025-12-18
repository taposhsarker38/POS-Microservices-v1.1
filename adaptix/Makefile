# Adaptix POS Microservices - Makefile

.PHONY: help up down build logs clean test verify-core shell

SERVICE ?= pos

help: ## Show this help message
	@echo 'Usage: make [target] [SERVICE=name]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all services in detached mode
	docker compose up -d

down: ## Stop all services
	docker compose down

restart: ## Restart all services or a specific service (make restart SERVICE=pos)
	docker compose restart $(SERVICE)

build: ## Build all services or a specific service (make build SERVICE=pos)
	docker compose up -d --build $(SERVICE)

logs: ## Follow logs for all services or a specific service (make logs SERVICE=pos)
	docker compose logs -f $(SERVICE)

clean: ## Remove stopped containers, networks, and dangling images
	docker compose down -v --remove-orphans
	docker system prune -f

verify-core: ## Run the shared core verification script
	python3 verify_all_core.py

test: ## Run tests for a service (make test SERVICE=pos)
	docker compose exec $(SERVICE) python manage.py test

shell: ## Open a bash shell in a service container (make shell SERVICE=pos)
	@echo "Entering shell for $(SERVICE)..."
	docker compose exec $(SERVICE) bash

lint: ## Run linting (placeholder)
	@echo "Running lint checks..."
	# Add flake8 or ruff command here

format: ## Run formatting (placeholder)
	@echo "Formatting code..."
	# Add black or ruff format command here
