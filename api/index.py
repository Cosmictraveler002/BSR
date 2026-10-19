"""
Vercel Serverless Entry Point
Exports the FastAPI ASGI app for Vercel's Python runtime.
Includes VercelPathMiddleware to handle original request paths in ASGI scope.
"""
import sys
import os
from urllib.parse import urlparse

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from app.main import app

    class VercelPathMiddleware:
        """ASGI Middleware to adjust scope['path'] to match the original requested URL on Vercel."""
        def __init__(self, app):
            self.app = app

        async def __call__(self, scope, receive, send):
            if scope["type"] == "http":
                headers = dict(scope.get("headers", []))
                original_path = None

                # 1. First priority: Check query parameter mapped by Vercel rewrites (?path=...)
                query_string = scope.get("query_string", b"").decode("utf-8")
                if "path=" in query_string:
                    from urllib.parse import parse_qs, urlencode
                    params = parse_qs(query_string)
                    if "path" in params and params["path"]:
                        val = params["path"][0]
                        if val:
                            if val == "reserve" or val.startswith("reserve/"):
                                original_path = f"/{val.lstrip('/')}"
                            else:
                                original_path = f"/api/{val.lstrip('/')}"
                        # Strip internal routing 'path' parameter from query string so endpoints stay clean
                        remaining_params = {k: v for k, v in params.items() if k != "path"}
                        scope["query_string"] = urlencode(remaining_params, doseq=True).encode("utf-8")

                # 2. Second priority: Check Vercel forwarded headers (ignore generic '/api')
                if not original_path:
                    for h in [b"x-vercel-forwarded-path", b"x-forwarded-path", b"x-forwarded-uri", b"x-original-uri"]:
                        if h in headers:
                            v = headers[h].decode("utf-8")
                            if v and v != "/api" and v != "/api/":
                                original_path = v
                                break

                # 3. Third priority: Check full forwarded URLs
                if not original_path:
                    for h in [b"x-forwarded-url", b"x-original-url"]:
                        if h in headers:
                            url_str = headers[h].decode("utf-8")
                            v = urlparse(url_str).path
                            if v and v != "/api" and v != "/api/":
                                original_path = v
                                break

                if original_path:
                    clean_path = original_path.split("?")[0]
                    scope["path"] = clean_path
                    scope["raw_path"] = clean_path.encode("utf-8")
                    print(f"[debug-routing] Overrode ASGI scope path to: {scope['path']}")
                    
            await self.app(scope, receive, send)

    app = VercelPathMiddleware(app)

except Exception as err:
    import traceback
    error_trace = traceback.format_exc()
    print(f"[!] Critical startup error in app.main: {err}\n{error_trace}")
    
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    app = FastAPI(title="BSR Diagnostic Fallback")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    def fallback_error_handler(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Application Startup Error",
                "detail": str(err),
                "traceback": [line.strip() for line in error_trace.splitlines() if line.strip()]
            }
        )
