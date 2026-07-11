# Framure Forge — frontend (static Vite build served by nginx)
#
# VITE_FORGE_API_URL is baked in at BUILD time (Vite inlines env vars):
#   docker build -t framure-forge-web \
#     --build-arg VITE_FORGE_API_URL=http://localhost:8000 .
# Leave the build-arg unset to ship the always-explorable mock mode.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_FORGE_API_URL=
ENV VITE_FORGE_API_URL=$VITE_FORGE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
