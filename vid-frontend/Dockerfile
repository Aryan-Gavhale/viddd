# Build from project root: docker build -f vid-frontend/Dockerfile .
# `../../../shared` from src/ resolves to /shared in the build image.

############################
# Build (Vite)
############################
FROM node:20-alpine AS builder
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app
COPY vid-frontend/package*.json ./
RUN npm ci

# Imports expect ../../../shared from src/utils/ → /shared
COPY shared /shared
COPY vid-frontend/ ./

RUN npm run build

############################
# Serve (nginx)
############################
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY vid-frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
