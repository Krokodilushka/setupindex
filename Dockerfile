FROM nginx:1.29-alpine

LABEL org.opencontainers.image.title="SetupIndex" \
      org.opencontainers.image.description="Static multilingual creator setup directory" \
      org.opencontainers.image.source="https://github.com/Krokodilushka/setupindex" \
      com.setupindex.image="true"

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY .output/public/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=4 \
  CMD wget -qO- http://127.0.0.1/healthz | grep -qx 'ok'
