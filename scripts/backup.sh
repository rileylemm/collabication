#!/bin/sh
# Backup script for Collabication MongoDB and collaboration server data

# Default values if not set in environment
: "${BACKUP_INTERVAL:=86400}"  # Default: daily (in seconds)
: "${BACKUP_RETENTION:=7}"     # Default: keep 7 backups

# Create timestamp for backup files
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="/backups"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Start logging
echo "Starting backup at $(date)" | tee -a $LOG_FILE

# Function to log messages
log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a $LOG_FILE
}

# Function to handle errors
handle_error() {
    log "ERROR: $1"
    exit 1
}

# Backup MongoDB
backup_mongodb() {
    log "Starting MongoDB backup..."
    
    # Create MongoDB backup directory
    MONGO_BACKUP_DIR="${BACKUP_DIR}/mongodb_${TIMESTAMP}"
    mkdir -p $MONGO_BACKUP_DIR
    
    # Run mongodump
    mongodump --host mongodb --out $MONGO_BACKUP_DIR --quiet || handle_error "MongoDB backup failed"
    
    # Compress backup
    tar -czf "${BACKUP_DIR}/mongodb_${TIMESTAMP}.tar.gz" -C $BACKUP_DIR "mongodb_${TIMESTAMP}" || handle_error "MongoDB compression failed"
    
    # Remove uncompressed backup directory
    rm -rf $MONGO_BACKUP_DIR
    
    log "MongoDB backup completed successfully"
}

# Backup collaboration server data
backup_collab_data() {
    log "Starting collaboration server data backup..."
    
    # Create collab data backup directory
    COLLAB_BACKUP_DIR="${BACKUP_DIR}/collab_${TIMESTAMP}"
    mkdir -p $COLLAB_BACKUP_DIR
    
    # Copy collab data
    cp -r /data/collab/* $COLLAB_BACKUP_DIR/ || handle_error "Collaboration data copy failed"
    
    # Compress backup
    tar -czf "${BACKUP_DIR}/collab_${TIMESTAMP}.tar.gz" -C $BACKUP_DIR "collab_${TIMESTAMP}" || handle_error "Collab data compression failed"
    
    # Remove uncompressed backup directory
    rm -rf $COLLAB_BACKUP_DIR
    
    log "Collaboration data backup completed successfully"
}

# Rotate old backups
rotate_backups() {
    log "Rotating old backups, keeping the last $BACKUP_RETENTION backups..."
    
    # MongoDB backups
    ls -t ${BACKUP_DIR}/mongodb_*.tar.gz 2>/dev/null | awk "NR>${BACKUP_RETENTION}" | xargs -r rm
    
    # Collab data backups
    ls -t ${BACKUP_DIR}/collab_*.tar.gz 2>/dev/null | awk "NR>${BACKUP_RETENTION}" | xargs -r rm
    
    # Log files
    ls -t ${BACKUP_DIR}/backup_*.log 2>/dev/null | awk "NR>${BACKUP_RETENTION}" | xargs -r rm
    
    log "Backup rotation completed"
}

# Execute backup process
log "Executing backup with retention period of $BACKUP_RETENTION backups"
backup_mongodb
backup_collab_data
rotate_backups

log "Backup process completed successfully"

# Loop for continuous backup
while true; do
    log "Sleeping for $BACKUP_INTERVAL seconds until next backup"
    sleep $BACKUP_INTERVAL
    
    # Create new timestamp and log file for the next backup
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"
    
    log "Starting backup at $(date)"
    backup_mongodb
    backup_collab_data
    rotate_backups
    log "Backup process completed successfully"
done 