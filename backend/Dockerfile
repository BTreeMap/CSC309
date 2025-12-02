# syntax=docker/dockerfile:1

################################################################################
# Build stage - install dependencies, generate Prisma client, and PREPARE for prod
################################################################################
FROM node:24-alpine AS builder

# Install build dependencies for native modules (bcrypt)
# Python and build-base are needed for node-gyp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for prisma generate)
RUN npm ci --no-audit --no-fund

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# OPTIMIZATION START: Clean up in the Builder stage
# 1. Prune to production dependencies
# 2. Aggressively remove unused files from node_modules BEFORE copying to prod
RUN npm prune --production && \
    # Remove cached package data
    rm -rf /root/.npm /root/.node-gyp && \
    # Remove common bloat from node_modules
    find ./node_modules -name "*.md" -delete && \
    find ./node_modules -name "*.ts" -delete && \
    find ./node_modules -name "*.map" -delete && \
    find ./node_modules -name "LICENSE*" -delete && \
    find ./node_modules -name "CHANGELOG*" -delete && \
    find ./node_modules -name "README*" -delete && \
    find ./node_modules -name ".npmignore" -delete && \
    find ./node_modules -name ".eslint*" -delete && \
    find ./node_modules -type d -name "test" -exec rm -rf {} + && \
    find ./node_modules -type d -name "tests" -exec rm -rf {} + && \
    find ./node_modules -type d -name "__tests__" -exec rm -rf {} + && \
    find ./node_modules -type d -name "docs" -exec rm -rf {} +

################################################################################
# Production stage - minimal runtime image
################################################################################
FROM node:24-alpine AS production

# Install tini for proper process management
# Combine user creation/modification into one step if strictly necessary, 
# but node:24-alpine already has a 'node' user (UID 1000). 
# We will use the built-in 'node' user to avoid creating a new one.
RUN apk add --no-cache tini

WORKDIR /app

# Copy ONLY the cleaned production node_modules from builder
# This effectively "flattens" the cleanup into a single ADD layer
COPY --from=builder --chown=node:node /app/node_modules ./node_modules/

# Copy application code
COPY --chown=node:node index.js ./
COPY --chown=node:node prisma ./prisma/

# Create directories for runtime data with correct permissions
RUN mkdir -p uploads && chown node:node uploads

# Switch to the built-in non-root user 'node'
USER node

# Environment variables (JWT_SECRET must be provided at runtime)
ENV NODE_ENV=production
# Set to "true" to auto-run database migrations on startup (disabled by default for safety)
ENV AUTO_MIGRATE=false

# Default port (can be overridden via command)
EXPOSE 3000

# Run database migrations (if enabled) and start the server
# Uses "prisma migrate deploy" which safely applies pending migrations
# Port is passed as argument: docker run -p 3000:3000 image 3000
ENTRYPOINT ["/sbin/tini", "--", "sh", "-c", "\
    if [ \"$AUTO_MIGRATE\" = 'true' ]; then \
        echo 'Running database migrations...' && \
        npx prisma migrate deploy; \
    fi && \
    exec node index.js \"$@\"", "--"]
CMD ["3000"]
