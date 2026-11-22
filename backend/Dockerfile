FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Populates STATIC_ROOT at build time (WhiteNoise serves it at runtime).
# Settings all have safe defaults, so this needs no real .env / DB.
RUN python manage.py collectstatic --noinput --skip-checks

EXPOSE 8000

CMD ["gunicorn", "kumbuka.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
