FROM python:3.14-slim-bookworm@sha256:cac1946205b382b2a656412ca211a5f8b64f74c8e9dcd2146308fccbf2bac5f1 AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

FROM base AS development
COPY apps/worker-python/worker.py ./worker.py
CMD ["python", "worker.py"]

FROM base AS test
COPY apps/worker-python/worker.py ./worker.py
RUN python -m py_compile worker.py
CMD ["python", "-m", "unittest", "discover"]

FROM cgr.dev/chainguard/python:latest@sha256:ce9aaca1f826f7f963cd031e98f8c19f993b1843096d395ea919b646e72cb8de AS production
WORKDIR /app
COPY --chown=65532:65532 apps/worker-python/worker.py ./worker.py
USER 65532
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/usr/bin/python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
CMD ["worker.py"]
