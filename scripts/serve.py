# Petit serveur statique pour le développement : python3 scripts/serve.py <dossier> <port>
import sys, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
d, port = sys.argv[1], int(sys.argv[2])
print("serving", d, "on http://127.0.0.1:%d" % port, flush=True)
ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=d)).serve_forever()
