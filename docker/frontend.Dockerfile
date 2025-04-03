FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Start the React development server
CMD ["npm", "run", "dev:react"] 