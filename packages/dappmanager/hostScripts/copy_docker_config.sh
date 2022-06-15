#!/bin/bash

CONFIG_FILE="/etc/docker/daemon.json"


if [ ! -f "$CONFIG_FILE" ]; then
    echo "Writing docker configuration to $CONFIG_FILE."
    cat > "$CONFIG_FILE" <<EOL
{
    "shutdown-timeout": "$DOCKER_CLIENT_TIMEOUT"
}
EOL
fi
