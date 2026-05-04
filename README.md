---
title: Safemind Backend
emoji: 🚀
colorFrom: pink
colorTo: gray
sdk: docker
pinned: false
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

# SafeMind Backend

## Development
```bash
npm install
npm run dev
```

## Build Docker image (Hugging Face Spaces ready)
This repository now includes a `Dockerfile` that listens on port `7860`, which is the default app port for Hugging Face Docker Spaces.

```bash
docker build -t safemind-backend .
docker run --rm -p 7860:7860 --env-file .env safemind-backend
```

Required environment variables:
- `DATABASE_URL`
- `GEMINI_API_KEY` (optional if you want AI-enabled flows)

## Deploy to Hugging Face Spaces (Docker)
1. Create a new Space with **SDK = Docker**.
2. Push this repository contents (including `Dockerfile`) to the Space repo.
3. Add Space Secrets for `DATABASE_URL` and `GEMINI_API_KEY` if needed.
4. Hugging Face will build and run the container automatically.
