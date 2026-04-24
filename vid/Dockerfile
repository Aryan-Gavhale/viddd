# Build from project root: docker build -f vid/Dockerfile .
# (Requires context c:\Automation\VID so `shared/` and `vid/` paths resolve.)

############################
# Builder
############################
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY vid/package*.json ./
RUN npm ci

COPY shared ./shared
COPY vid/tsconfig.json ./
COPY vid/src ./src

RUN npm run build

############################
# Production
# Resolved imports from dist/ (e.g. ../../shared) point to /shared, not /app/shared
############################
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY vid/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared /shared
RUN mkdir -p public
RUN mkdir -p /app/logs && chown -R node:node /app

EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
