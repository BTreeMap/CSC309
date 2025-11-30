# syntax=docker/dockerfile:1

################################################################################
# Build stage - install dependencies and generate Prisma client
################################################################################
FROM node:24-alpine AS builder

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for prisma generate)
RUN npm ci --no-audit --no-fund

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Remove devDependencies after prisma generate
RUN npm prune --production

################################################################################
# Production stage - minimal runtime image
################################################################################
FROM node:24-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy only production node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules/

# Copy application code
COPY --chown=nodejs:nodejs index.js ./
COPY --chown=nodejs:nodejs prisma ./prisma/

# Create directories for runtime data
RUN mkdir -p uploads && chown nodejs:nodejs uploads

# Clean up caches and unnecessary files
RUN rm -rf /root/.npm /root/.node-gyp /tmp/* /var/cache/apk/* && \
    find /app/node_modules -name "*.md" -delete 2>/dev/null || true && \
    find /app/node_modules -name "*.ts" -delete 2>/dev/null || true && \
    find /app/node_modules -name "*.map" -delete 2>/dev/null || true && \
    find /app/node_modules -name "LICENSE*" -delete 2>/dev/null || true && \
    find /app/node_modules -name "CHANGELOG*" -delete 2>/dev/null || true && \
    find /app/node_modules -name "README*" -delete 2>/dev/null || true && \
    find /app/node_modules -name ".npmignore" -delete 2>/dev/null || true && \
    find /app/node_modules -name ".eslint*" -delete 2>/dev/null || true && \
    find /app/node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find /app/node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find /app/node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
    find /app/node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true

# Switch to non-root user
USER nodejs

# Environment variables (JWT_SECRET must be provided at runtime)
ENV NODE_ENV=production

# Default port (can be overridden via command)
EXPOSE 3000

# Run database migrations and start the server
# Port is passed as argument: docker run -p 3000:3000 image 3000
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && exec node index.js \"$@\"", "--"]
CMD ["3000"]
