#!/bin/bash

# Healthcheck script for the collaboration server

wget --spider -q http://localhost:1234/health

# Check if wget was successful
if [ $? -eq 0 ]; then
  echo "Collaboration server is healthy"
  exit 0
else
  echo "Collaboration server is unhealthy"
  exit 1
fi 