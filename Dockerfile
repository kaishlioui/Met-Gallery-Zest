# ── Build stage: compile React frontend ──────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Production stage: lean Node server ───────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Only copy what we need to run
COPY package*.json ./
RUN npm install --omit=dev
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server/index.js"]
