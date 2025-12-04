FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# create non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 9001
CMD ["node", "app.js"]
