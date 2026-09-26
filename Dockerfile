# ==========================================
# Multi-stage Dockerfile for GasRMS-Telemetry-Monitor
# ==========================================

# Stage 1: Build Frontend and Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build client
COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package files and install only production dependencies + tsx runtime
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy built frontend assets and server codebase
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types

# Expose SCADA Dashboard and Telemetry port
EXPOSE 3001

# Start SCADA unified server
CMD ["tsx", "server/index.ts"]
