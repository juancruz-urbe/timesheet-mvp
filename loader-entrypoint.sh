#!/bin/sh
SCHEDULE="${LOADER_CRON_SCHEDULE:-0 20 * * *}"
echo "${SCHEDULE} cd /app && python loader.py >> /var/log/loader.log 2>&1" | crontab -

python loader.py

cron -f
