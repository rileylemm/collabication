FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY backend/package.json backend/

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps
RUN cd backend && npm install --legacy-peer-deps

# Expose API port
EXPOSE 4000

# Start the API server
CMD ["node", "backend/api/server.js"] 