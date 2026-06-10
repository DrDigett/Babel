FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
