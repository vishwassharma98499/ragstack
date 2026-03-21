.PHONY: dev test lint clean

dev:
	docker compose up --build

dev-groq:
	docker compose -f docker-compose.groq.yml up --build

test:
	cd backend && python -m pytest tests/ -v

lint:
	cd backend && python -m flake8 app/ --max-line-length 120

clean:
	docker compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
