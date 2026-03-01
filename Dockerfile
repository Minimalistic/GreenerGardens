# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN npm install
COPY packages/shared packages/shared
COPY packages/frontend packages/frontend
COPY tsconfig.base.json ./
WORKDIR /app/packages/frontend
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN npm install
COPY packages/shared packages/shared
COPY packages/backend packages/backend
COPY tsconfig.base.json ./
WORKDIR /app/packages/backend
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN npm install --omit=dev

# Copy shared source (needed at runtime for schema imports)
COPY packages/shared packages/shared

# Copy built backend
COPY --from=backend-build /app/packages/backend/dist packages/backend/dist
COPY packages/backend/src/db/migrations packages/backend/dist/db/migrations

# Copy seed data
COPY seed_data seed_data

# Copy built frontend into a static directory the backend can serve
COPY --from=frontend-build /app/packages/frontend/dist packages/frontend/dist

# Create data directory
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/gardenvault.db

EXPOSE 3000

CMD ["node", "packages/backend/dist/index.js"]
