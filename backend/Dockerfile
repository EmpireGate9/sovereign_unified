FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
# why: run migrations first to avoid startup race
CMD /bin/sh -lc "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
