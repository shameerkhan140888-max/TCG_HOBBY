FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps

COPY package.json package-lock.json* turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN npm ci

FROM deps AS build

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN npm run db:generate
RUN npm run build -w @tcg-hobby/api