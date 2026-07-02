FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install

FROM deps AS verify
ENV DATABASE_URL="postgresql://tcg_hobby:tcg_hobby@postgres:5432/tcg_hobby?schema=public"
RUN npm run db:generate
RUN npm run typecheck
RUN npm run test
RUN npm run build
