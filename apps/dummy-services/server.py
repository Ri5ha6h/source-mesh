import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class BoundaryHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        status = 200 if self.path == "/health" else 501
        payload = {
            "status": "ok" if status == 200 else "not_implemented",
            "syntheticOnly": True,
            "externalCalls": False,
        }
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args: object) -> None:
        return


ThreadingHTTPServer(("0.0.0.0", 8100), BoundaryHandler).serve_forever()
