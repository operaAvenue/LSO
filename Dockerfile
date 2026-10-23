FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
RUN mkdir -p /app/backend/outputs/audio /app/backend/outputs/manifests /app/backend/outputs/uploads

WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/package.json ./
COPY --from=frontend-builder /app/frontend/node_modules ./node_modules
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/next.config.ts ./next.config.ts

WORKDIR /app
RUN printf '#!/usr/bin/env bash\nset -e\ncd /app/backend\nuvicorn main:app --host 127.0.0.1 --port 8000 &\ncd /app/frontend\nexport BACKEND_INTERNAL_URL=http://127.0.0.1:8000\nexec npm run start -- -p 3000 -H 0.0.0.0\n' > /usr/local/bin/start-lso.sh && chmod +x /usr/local/bin/start-lso.sh

EXPOSE 3000 8000
CMD ["/usr/local/bin/start-lso.sh"]
