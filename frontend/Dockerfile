FROM nginx:1.27-alpine
# Remove default config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css app.js sw.js manifest.json icon-192.png icon-512.png /usr/share/nginx/html/
RUN chown -R nginx:nginx /usr/share/nginx/html/ && chmod -R 755 /usr/share/nginx/html/
EXPOSE 80
