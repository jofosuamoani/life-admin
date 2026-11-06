#!/bin/sh
set -e
# The data directory (a Fly volume) is created owned by root. Give it to the
# `node` user, then drop root privileges before starting the server.
DATA_DIR="$(dirname "${DATABASE_PATH:-/data/life-admin.db}")"
mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR"
exec setpriv --reuid=node --regid=node --init-groups "$@"
