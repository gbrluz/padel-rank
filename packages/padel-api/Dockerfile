FROM node:20-alpine AS builder

WORKDIR /app

COPY packages/padel-types ./packages/padel-types
WORKDIR /app/packages/padel-types
RUN npm install && npm run build

WORKDIR /app
COPY packages/padel-api/package*.json ./packages/padel-api/
WORKDIR /app/packages/padel-api
RUN npm install

COPY packages/padel-api ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/packages/padel-types/dist ./node_modules/@padel/types/dist
COPY --from=builder /app/packages/padel-types/package.json ./node_modules/@padel/types/
COPY --from=builder /app/packages/padel-api/dist ./dist
COPY --from=builder /app/packages/padel-api/node_modules ./node_modules
COPY --from=builder /app/packages/padel-api/package.json ./

EXPOSE 3000

CMD ["node", "dist/server.js"]
