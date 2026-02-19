FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies
# Note: libgl1-mesa-glx was renamed to libgl1 in Debian Trixie+
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python deps — pip will auto-select the correct torch wheel for
# the current platform (ARM64 on Apple Silicon, x86_64 on Intel/AMD).
# Do NOT pass --extra-index-url for pytorch when not pinning +cpu builds.
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directories
RUN mkdir -p /data/chroma /data/uploads /app/demo_pdfs

# Pre-download the embedding model during build for faster startup
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
