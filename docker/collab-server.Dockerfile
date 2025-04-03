FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY backend/package.json backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Expose collaboration server port
EXPOSE 1234

# Start the collaboration server
CMD ["node", "backend/services/collab-server.js"] 