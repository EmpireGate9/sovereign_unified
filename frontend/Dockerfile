# استخدم Nginx لتقديم ملفات الواجهة
FROM nginx:stable-alpine

# انسخ ملفات الواجهة إلى مجلد التقديم الافتراضي
COPY . /usr/share/nginx/html

# فتح المنفذ 80
EXPOSE 80

# تشغيل Nginx
CMD ["nginx", "-g", "daemon off;"]
