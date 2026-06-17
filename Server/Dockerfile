FROM python:3.12-slim

# Instala dependências de sistema: ffmpeg + todas as libs que o OpenCV precisa
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    libx11-6 \
    libxext6 \
    libsm6 \
    libxrender1 \
    libfontconfig1 \
    libice6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY . .

# best.pt será baixado em /app/best.pt pelo main.py no startup
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
