# =============================================================================
# EarthScan React frontend (Vite build served by nginx).
# NEW FILE - no frontend source was modified.
#
# VITE_API_URL is baked in at build time. It must be the address the BROWSER
# uses to reach the API gateway (not the docker-internal hostname).
# =============================================================================
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .

ARG VITE_API_URL=http://localhost:5130
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
