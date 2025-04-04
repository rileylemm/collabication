# Collabication Installation Guide

This guide provides step-by-step instructions for setting up and running the Collabication application in both development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Configuration Options](#configuration-options)
- [Troubleshooting](#troubleshooting)

## Prerequisites

The following software needs to be installed on your system:

- **Docker** (version 20.10.0 or higher)
- **Docker Compose** (version 2.0.0 or higher)
- **Node.js** (version 18.x or higher)
- **npm** (version 9.x or higher)
- **Git** (version 2.30.0 or higher)

For development, you'll also need:

- A code editor (VS Code recommended)
- A modern web browser (Chrome or Firefox recommended)

For production, you'll additionally need:

- A domain name (for SSL setup)
- Access to a server with sufficient resources (minimum 4GB RAM, 2 CPU cores, 50GB storage)
- SSL certificates (or the ability to generate them with Let's Encrypt)

## Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/rileylemm/collabication.git
cd collabication
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit the `.env` file with appropriate values for your development environment. The most important ones are:

- `JWT_SECRET`: A random string for securing authentication
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: For GitHub integration (optional for initial development)

### 4. Start the development environment

```bash
# Start all services using Docker Compose
docker-compose up -d

# Start the Electron application in development mode
npm run dev
```

The application should now be running in development mode. The Electron application will connect to the local Docker services.

### 5. Development workflow

- Frontend code is in the `src` directory
- Backend services are in the `backend` directory
- Changes to React code will hot-reload automatically
- Changes to backend services require restarting the respective Docker container

## Production Setup

### 1. Prepare the server

Ensure your server has Docker and Docker Compose installed. Clone the repository:

```bash
git clone https://github.com/rileylemm/collabication.git
cd collabication
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit the `.env` file with appropriate values for your production environment:

- `DOMAIN`: Your domain name
- `JWT_SECRET`: A strong random string for securing authentication
- `MONGO_ROOT_PASSWORD`: A strong password for MongoDB
- `MONGO_PASSWORD`: A strong password for the application user

### 3. Configure SSL certificates

You have two options:

**Option A: Use existing certificates**

Place your SSL certificate files in `nginx/ssl/cert.pem` and `nginx/ssl/key.pem`.

**Option B: Generate self-signed certificates automatically**

The deployment script will generate self-signed certificates for you. Note that these are not suitable for public-facing production sites but work for internal deployments.

### 4. Deploy the application

Run the deployment script:

```bash
chmod +x scripts/build-and-deploy.sh
./scripts/build-and-deploy.sh production
```

This script will:
- Create necessary directories
- Set up SSL certificates if they don't exist
- Build Docker images for all services
- Start all containers

### 5. Access the application

Once deployed, the application can be accessed in several ways:

- **Web interface**: https://your-domain.com
- **Collaboration API**: wss://collab.your-domain.com
- **Admin dashboard**: https://your-domain.com/admin (requires admin credentials)
- **Log viewer**: http://your-server-ip:5601 (Kibana, accessible only from within the server by default)

### 6. Build Electron application for distribution

To build the Electron application for distribution:

```bash
# For all platforms
npm run make:all

# For specific platforms
npm run make:win   # Windows
npm run make:mac   # macOS
npm run make:linux # Linux
```

The packaged applications will be available in the `out` directory.

## Configuration Options

### Docker Compose Configuration

The application uses two Docker Compose files:

- `docker-compose.yml`: For development
- `docker-compose.prod.yml`: For production

Each can be customized to suit your specific needs.

### Environment Variables

See the `.env.example` file for a complete list of environment variables. Some key variables include:

| Variable | Description | Default |
|----------|-------------|---------|
| `DOMAIN` | Domain name for the application | example.com |
| `JWT_SECRET` | Secret for JWT token generation | (must be set) |
| `MONGO_ROOT_PASSWORD` | MongoDB root password | (must be set) |
| `LOG_LEVEL` | Logging level | info |
| `BACKUP_INTERVAL` | Seconds between backups | 86400 (1 day) |
| `BACKUP_RETENTION` | Number of backups to keep | 7 |

### Logging Configuration

The logging system uses Fluentd, Elasticsearch, and Kibana:

- **Fluentd configuration**: `logging/fluent.conf`
- **Elasticsearch**: Access via http://your-server-ip:9200
- **Kibana**: Access via http://your-server-ip:5601

Kibana includes preconfigured dashboards for monitoring application logs.

## Troubleshooting

### Common Issues

#### Connection Refused to MongoDB

Check that MongoDB is running and the credentials are correct:

```bash
docker-compose ps
docker logs collabication_mongodb_1
```

#### SSL Certificate Issues

If you're seeing SSL certificate errors, ensure your certificates are correctly placed:

```bash
ls -la nginx/ssl/
```

#### Application Not Starting

Check the logs for each service:

```bash
docker-compose logs frontend-build
docker-compose logs npcsh-api
docker-compose logs collab-server
```

### Log Analysis

Use Kibana to analyze logs and diagnose issues:

1. Open Kibana at http://your-server-ip:5601
2. Go to "Discover" to search through logs
3. Use the preconfigured "Collabication Overview" dashboard to see key metrics

### Getting Support

If you encounter issues not covered here, please:

1. Check the GitHub Issues for similar problems
2. Open a new issue if needed, providing logs and error messages
3. Reach out to the community on the project's discussion forum

## Maintenance

### Backups

Backups are automatically created according to the schedule in your `.env` file. They are stored in the `backups` directory. To manually trigger a backup:

```bash
docker exec collabication_backup_1 /scripts/backup.sh
```

### Updates

To update the application:

1. Pull the latest changes from the repository
   ```bash
   git pull
   ```

2. Rebuild and restart the containers
   ```bash
   ./scripts/build-and-deploy.sh production
   ```

### Monitoring

Monitor the application's health using:

- Health check endpoints: https://your-domain.com/health
- Kibana dashboards for log analysis
- Docker container health checks:
  ```bash
  docker ps --format "{{.Names}}: {{.Status}}"
  ``` 