# syntax=docker/dockerfile:1

# ---- Build: install everything, build the web app and the server bundle ----
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime: production dependencies + built output only ----
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace server && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
COPY docker-entrypoint.sh /usr/local/bin/

# Fly volumes mount as root; the entrypoint fixes ownership of /data, then
# runs the server as the unprivileged `node` user.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "--disable-warning=ExperimentalWarning", "server/dist/index.js"]
