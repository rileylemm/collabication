FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY backend/package.json backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Expose API port
EXPOSE 4000

# Start the API server
CMD ["node", "backend/api/server.js"] 