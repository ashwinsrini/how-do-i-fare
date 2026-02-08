# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copy workspace root manifests
COPY package.json ./

# Copy workspace package manifests
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

RUN npm install

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

RUN npm run build --workspace=@dev-leaderboard/web

# ── Production stage ────────────────────────────────────────
FROM nginx:alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
