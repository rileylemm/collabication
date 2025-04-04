#!/bin/bash
# Build and deploy script for Collabication

# Exit on error
set -e

# Default environment
ENV=${1:-production}
CONFIG_FILE="docker-compose.${ENV}.yml"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file $CONFIG_FILE not found."
    echo "Usage: $0 [environment]"
    echo "Where environment is 'production' (default) or 'dev'"
    exit 1
fi

# Check if .env file exists, create from example if not
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "Warning: .env file not found. Creating from .env.example."
        cp .env.example .env
        echo "Please edit .env file with your configuration values."
        exit 1
    else
        echo "Error: Neither .env nor .env.example found."
        exit 1
    fi
fi

# Load environment variables
source .env

# Create required directories
echo "Creating required directories..."
mkdir -p nginx/conf
mkdir -p nginx/ssl
mkdir -p nginx/www
mkdir -p logs
mkdir -p backups
mkdir -p scripts
mkdir -p mongo-init
mkdir -p mongo-backups

# Check if SSL certificates exist, generate self-signed if not
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo "SSL certificates not found. Generating self-signed certificates for development..."
    
    # Check if openssl is installed
    if ! command -v openssl &> /dev/null; then
        echo "Error: openssl is required for certificate generation but is not installed."
        exit 1
    fi
    
    # Generate self-signed certificates
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=Department/CN=${DOMAIN:-example.com}"
    
    echo "Self-signed certificates generated. Replace with proper certificates for production use."
fi

# Make scripts executable
chmod +x scripts/*.sh

# Copy config files if needed
if [ ! -f "nginx/conf/default.conf" ]; then
    cp nginx/conf/default.conf nginx/conf/
fi

# Create MongoDB init script if not exists
if [ ! -f "mongo-init/init-mongo.js" ]; then
    cat > mongo-init/init-mongo.js << EOF
// MongoDB initialization script
db = db.getSiblingDB('admin');

// Create app user
db.createUser({
  user: '${MONGO_USER:-collabication_user}',
  pwd: '${MONGO_PASSWORD:-changeme}',
  roles: [
    { role: 'readWrite', db: '${MONGO_DATABASE:-collabication}' }
  ]
});

// Create application database
db = db.getSiblingDB('${MONGO_DATABASE:-collabication}');

// Create initial collections
db.createCollection('users');
db.createCollection('documents');
db.createCollection('collaborations');
db.createCollection('history');
EOF
    echo "Created MongoDB initialization script."
fi

# Build and deploy using Docker Compose
echo "Building and deploying with $CONFIG_FILE..."
docker-compose -f $CONFIG_FILE build

echo "Starting services..."
docker-compose -f $CONFIG_FILE up -d

echo "Deployment completed successfully!"
echo "Access the application at https://${DOMAIN:-example.com}"

# Show running containers
echo "Running containers:"
docker-compose -f $CONFIG_FILE ps 