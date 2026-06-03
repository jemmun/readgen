FROM python:3.11-slim

WORKDIR /app

# Use Tsinghua mirror for faster apt-get
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple

COPY . .

RUN mkdir -p uploads/illustrations

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
