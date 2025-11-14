FROM python:3.10-slim

WORKDIR /app

# الملفات موجودة في مجلد backend داخل الريبو
COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# انسخ كود الباكенд كله
COPY backend .

# سكربت التشغيل موجود داخل backend أيضًا
COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
CMD ["/entrypoint.sh"]
