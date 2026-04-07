# ==================================
# Stage 1: Build React Frontend
# ==================================
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY components.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build the React app for production
RUN npm run build

# ==================================
# Stage 2: Production Node.js Server
# ==================================
FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies for backend
RUN npm ci --production

# Copy backend source code
COPY backend/*.js ./

# Copy the built React app from Stage 1
COPY --from=frontend-build /app/dist ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check - checks if the server is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

# Expose port 8080 (ECS will map this)
EXPOSE 8080

# Start the Node.js backend server
# The backend will serve both API and static frontend files
CMD ["node", "server.js"]
