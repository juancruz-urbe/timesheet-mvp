#!/bin/sh
echo '0 20 * * * cd /app && python loader.py >> /var/log/loader.log 2>&1' | crontab -

python loader.py

cron -f
