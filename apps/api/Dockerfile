# ── Build stage ──────────────────────────────────────────────
FROM node:22-alpine AS build

# Native addon build deps (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace root manifests
COPY package.json ./

# Copy workspace package manifests
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install all deps
RUN npm install

# Copy source code
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Remove dev dependencies
RUN npm prune --omit=dev

# ── Production stage ────────────────────────────────────────
FROM node:22-alpine

# bcrypt runtime dependency
RUN apk add --no-cache libstdc++

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/package.json ./

EXPOSE 3001

CMD ["node", "apps/api/src/index.js"]
