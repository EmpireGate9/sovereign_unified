# استخدم صورة Node للبناء
FROM node:18-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# استخدم Nginx للتقديم
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
