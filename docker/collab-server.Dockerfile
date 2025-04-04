FROM node:18-slim

# Install wget for healthcheck
RUN apt-get update && apt-get install -y wget && apt-get clean

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY backend/package.json backend/

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps
RUN cd backend && npm install --legacy-peer-deps

# Create directory for logs
RUN mkdir -p logs

# Expose collaboration server port
EXPOSE 1234

# Create a healthcheck script
COPY docker/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

# Set health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD [ "wget", "--spider", "-q", "http://localhost:1234/health" ]

# Start the collaboration server
CMD ["node", "backend/services/collab-server.js"] 