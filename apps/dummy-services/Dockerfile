FROM python:3.14-slim-bookworm@sha256:cac1946205b382b2a656412ca211a5f8b64f74c8e9dcd2146308fccbf2bac5f1 AS development
WORKDIR /app
COPY apps/dummy-services/server.py ./server.py
CMD ["python", "server.py"]

FROM development AS test
RUN python -m py_compile server.py

FROM cgr.dev/chainguard/python:latest@sha256:ce9aaca1f826f7f963cd031e98f8c19f993b1843096d395ea919b646e72cb8de AS production
WORKDIR /app
COPY --chown=65532:65532 apps/dummy-services/server.py ./server.py
USER 65532
EXPOSE 8100
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD ["/usr/bin/python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8100/health')"]
CMD ["server.py"]
