#!/usr/bin/env sh
# NF-3: a dated copy of the database. Run it from cron or your host's scheduler.
# Requires the MongoDB Database Tools (mongodump). Restore with: mongorestore --uri "$MONGODB_URI" --drop backups/<date>
set -e
URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/setu_college_portal}"
OUT="backups/$(date +%F-%H%M)"
mkdir -p backups
mongodump --uri="$URI" --out="$OUT"
echo "Backup written to $OUT"
