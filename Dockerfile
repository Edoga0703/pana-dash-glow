FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .

ARG VITE_N8N_BASE_URL
ARG VITE_AUTH_HEADER_NAME
ARG VITE_AUTH_HEADER_VALUE
ENV VITE_N8N_BASE_URL=$VITE_N8N_BASE_URL
ENV VITE_AUTH_HEADER_NAME=$VITE_AUTH_HEADER_NAME
ENV VITE_AUTH_HEADER_VALUE=$VITE_AUTH_HEADER_VALUE

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
