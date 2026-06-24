# ---- build the frontend ----
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- backend serving the built SPA ----
FROM python:3.11-slim
WORKDIR /srv
COPY backend/ /srv/backend/
RUN pip install --no-cache-dir -e /srv/backend
# main.py serves ../../frontend/dist relative to backend/app/main.py -> /srv/frontend/dist
COPY --from=web /web/dist /srv/frontend/dist

ENV ARENA_HOST=0.0.0.0 \
    ARENA_PORT=7860 \
    ARENA_OLLAMA_HOST=http://host.docker.internal:11434
EXPOSE 7860

CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "/srv/backend", "--host", "0.0.0.0", "--port", "7860"]
