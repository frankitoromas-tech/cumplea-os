# Reproducible deploy (Railway: Settings → Builder → Dockerfile)
FROM python:3.11-slim-bookworm

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_DATA_DIR=/app/data \
    GUNICORN_WORKERS=1 \
    GUNICORN_THREADS=4 \
    RAILWAY_GUNICORN_WORKERS_MAX=1 \
    PREVIEW_MODE_ENABLED=1

RUN mkdir -p /app/data

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8000')+'/healthz', timeout=5)"

CMD ["sh", "-c", "exec gunicorn app:app -c gunicorn.conf.py --bind 0.0.0.0:${PORT:-8000}"]
