# single image for both loader and API
FROM python:3.13-slim

# establish a consistent working directory inside the container
WORKDIR /app

# install cron (needed by the loader service)
RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

# install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# copy source code
COPY . .
RUN chmod +x /app/loader-entrypoint.sh
