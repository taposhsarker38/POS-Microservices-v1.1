FROM node:20-alpine

WORKDIR /app
COPY services/ws-gateway/package.json services/ws-gateway/package-lock.json* ./
RUN npm install --production

COPY services/ws-gateway/ .

# create non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 9001
CMD ["node", "app.js"]
