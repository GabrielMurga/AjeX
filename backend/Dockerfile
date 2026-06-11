FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl bash

COPY package.json tsconfig.json ./
COPY prisma ./prisma

RUN npm install

COPY src ./src

EXPOSE 4000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push --accept-data-loss && npm run seed && npm run dev"]
