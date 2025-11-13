FROM nginx:stable-alpine
# انسخ الملفات الثلاثة مباشرة إلى جذر html
COPY frontend/index.html /usr/share/nginx/html/index.html
COPY frontend/styles.css  /usr/share/nginx/html/styles.css
COPY frontend/app.js      /usr/share/nginx/html/app.js
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
