# ── Build stage ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# sharp ต้องการ build tools บน Alpine
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json ./
RUN npm install --production

# ── Runtime stage ─────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# runtime deps สำหรับ sharp (libvips)
RUN apk add --no-cache vips

COPY --from=builder /app/node_modules ./node_modules
COPY . .

# สร้าง uploads dir (จะถูก override โดย volume)
RUN mkdir -p /app/uploads

EXPOSE 3967

USER node

CMD ["node", "server.js"]
