FROM node:18-slim as build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY backend/package.json backend/

# Install dependencies
RUN npm ci
RUN cd backend && npm ci

# Copy application code
COPY . .

# Create the final image with just the necessary files
FROM node:18-slim

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && apt-get clean

# Create a non-root user to run the application
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/backend /app/backend
COPY --from=build /app/node_modules /app/node_modules

# Create directories for logs and data
RUN mkdir -p logs data && chown -R appuser:appuser logs data

# Copy healthcheck script
COPY docker/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

# Expose collaboration server port
EXPOSE 1234

# Set health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD [ "wget", "--spider", "-q", "http://localhost:1234/health" ]

# Switch to non-root user
USER appuser

# Start the collaboration server
CMD ["node", "backend/services/collab-server.js"] 