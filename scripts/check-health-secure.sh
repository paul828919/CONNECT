#!/bin/bash
# Health check using SSH key authentication (no password needed)

# Just use the connect-prod SSH alias
REMOTE_SERVER="connect-prod"

# Include the original check-health.sh logic but with SSH key
source "$(dirname "$0")/check-health.sh"
