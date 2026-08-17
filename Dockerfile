FROM python:3.12-slim

WORKDIR /app

# Install system compiler dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

ENV PORT=8000
EXPOSE 8000

CMD uvicorn api.index:app --host 0.0.0.0 --port $PORT
