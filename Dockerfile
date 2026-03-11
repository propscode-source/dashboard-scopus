# Use Node.js LTS as the base image
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the Vite app for production
RUN npm run build
# Compile TypeScript server file if needed, or we can just use tsx/node
# We will use tsx in production for simplicity, or we can compile it.
# For this setup, we'll just copy everything needed.

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built assets and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expose the port
EXPOSE 3000

# Start the server using tsx (or node if compiled)
CMD ["npx", "tsx", "server.ts"]
