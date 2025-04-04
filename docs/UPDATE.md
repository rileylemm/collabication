# Collabication Update Guide

This guide describes the update mechanisms for deployed instances of the Collabication application, covering both server-side components and the Electron client application.

## Table of Contents

- [Update Mechanisms Overview](#update-mechanisms-overview)
- [Server-Side Updates](#server-side-updates)
- [Electron Client Updates](#electron-client-updates)
- [Database Migrations](#database-migrations)
- [Rollback Procedures](#rollback-procedures)

## Update Mechanisms Overview

Collabication implements two primary update mechanisms:

1. **Server-side updates** - For Docker-based backend services and web components
2. **Electron client updates** - For the desktop application using Electron's auto-updater

## Server-Side Updates

### Manual Update Process

The server-side components can be updated manually using Git and Docker Compose:

1. Navigate to the application directory:
   ```bash
   cd /path/to/collabication
   ```

2. Pull the latest changes:
   ```bash
   git pull origin main
   ```

3. Rebuild and restart services:
   ```bash
   ./scripts/build-and-deploy.sh production
   ```

This process will:
- Pull the latest code
- Rebuild Docker images with the new code
- Perform any necessary database migrations
- Restart services with minimal downtime

### Automated Updates

For automated updates, you can set up a CI/CD pipeline using GitHub Actions:

1. The repository includes a GitHub Actions workflow in `.github/workflows/deploy.yml`
2. Configure your server as a GitHub Actions runner
3. The workflow will automatically deploy changes when pushed to the main branch

To set up the GitHub Actions runner:

```bash
# Create a directory for the runner
mkdir -p /opt/actions-runner && cd /opt/actions-runner

# Download the runner (adjust URL for your system)
curl -O -L https://github.com/actions/runner/releases/download/v2.296.0/actions-runner-linux-x64-2.296.0.tar.gz

# Extract and configure
tar xzf ./actions-runner-linux-x64-2.296.0.tar.gz
./config.sh --url https://github.com/rileylemm/collabication --token YOUR_TOKEN

# Install and start the service
sudo ./svc.sh install
sudo ./svc.sh start
```

## Electron Client Updates

The Electron client application uses `electron-updater` to automatically check for and install updates.

### How Auto-Updates Work

1. When the application starts, it checks for updates from the configured update server
2. If an update is available, it is downloaded in the background
3. The user is notified when the update is ready to install
4. The update is installed when the application is restarted

### Configuration

Auto-updates are configured in `package.json` under the `publish` section:

```json
"publish": [
  {
    "provider": "github",
    "owner": "rileylemm",
    "repo": "collabication"
  }
]
```

### Publishing Updates

To publish a new update for the Electron client:

1. Update the version in `package.json`:
   ```json
   "version": "0.1.1"
   ```

2. Build the application for all platforms:
   ```bash
   npm run make:all
   ```

3. Publish the release:
   ```bash
   npm run publish
   ```

This will:
- Create a new GitHub release with the version number
- Upload the built applications as assets
- Sign the release (if configured)

### Testing Updates

To test the update mechanism:

1. Build and publish version 0.1.0
2. Install the application
3. Build and publish version 0.1.1
4. The installed application should detect and download the update

## Database Migrations

Database migrations are handled automatically during the update process.

### Migration Scripts

Migration scripts are stored in `backend/migrations` and follow a naming convention:

```
YYYYMMDD_description.js
```

For example:
```
20230401_add_user_roles.js
```

### Running Migrations Manually

Migrations can be run manually using:

```bash
docker-compose exec npcsh-api node backend/scripts/run-migrations.js
```

### Creating New Migrations

To create a new migration:

1. Create a file in `backend/migrations` with the current date
2. Implement the `up` and `down` functions:

```javascript
module.exports = {
  up: async (db) => {
    // Migration code to apply changes
    await db.collection('users').updateMany({}, { $set: { role: 'user' } });
  },
  down: async (db) => {
    // Migration code to revert changes
    await db.collection('users').updateMany({}, { $unset: { role: '' } });
  }
};
```

## Rollback Procedures

If an update causes issues, you can roll back to a previous version.

### Server-Side Rollback

1. Check out the previous version:
   ```bash
   git log --oneline  # Find the commit hash
   git checkout <commit_hash>
   ```

2. Rebuild and restart:
   ```bash
   ./scripts/build-and-deploy.sh production
   ```

3. Run down migrations if needed:
   ```bash
   docker-compose exec npcsh-api node backend/scripts/run-migrations.js --down
   ```

### Electron Client Rollback

1. Publish the previous version again as the latest release
2. Users will need to download this version manually, as auto-downgrade is not supported

### Emergency Recovery

If a critical error occurs:

1. Restore from the latest backup:
   ```bash
   ./scripts/restore-backup.sh latest
   ```

2. Check and restart services:
   ```bash
   docker-compose ps
   docker-compose restart <service_name>
   ```

## Monitoring Updates

Monitor the health of your application after updates:

1. Check service health:
   ```bash
   docker-compose ps
   ```

2. View logs:
   ```bash
   docker-compose logs --tail=100
   ```

3. Check the Kibana dashboard for errors

4. Verify application endpoints:
   ```bash
   curl -I https://your-domain.com/health
   ```

## Best Practices

- Always test updates in a staging environment before deploying to production
- Maintain regular backups before applying updates
- Document changes between versions
- Monitor the application closely after updates
- Implement canary deployments for critical updates 