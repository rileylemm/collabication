FROM node:18-slim as build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Create the final image with just the built application
FROM node:18-slim

WORKDIR /app

# Copy built files from the build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/package.json

# Install only production dependencies
RUN npm ci --omit=dev

# Expose port if needed for the built application
EXPOSE 3000

# Command to run the production application
CMD ["npm", "run", "start:prod"] 