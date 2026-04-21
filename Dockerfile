FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Keep the mounted node_modules volume aligned with package-lock before booting Vite.
CMD ["sh", "-c", "npm ci && npm run dev -- --host 0.0.0.0 --port 3000"]
