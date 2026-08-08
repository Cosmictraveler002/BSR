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
                
                # Check headers for original requested path
                original_path = None
                
                # Try x-vercel-forwarded-path (Vercel standard for original path)
                if b"x-vercel-forwarded-path" in headers:
                    original_path = headers[b"x-vercel-forwarded-path"].decode("utf-8")
                # Try x-forwarded-path
                elif b"x-forwarded-path" in headers:
                    original_path = headers[b"x-forwarded-path"].decode("utf-8")
                # Try extracting path from x-forwarded-url
                elif b"x-forwarded-url" in headers:
                    url_str = headers[b"x-forwarded-url"].decode("utf-8")
                    original_path = urlparse(url_str).path
                # Try extracting from x-original-url
                elif b"x-original-url" in headers:
                    url_str = headers[b"x-original-url"].decode("utf-8")
                    original_path = urlparse(url_str).path
                
                if original_path:
                    # Update ASGI scope path to the original path so FastAPI router can match it
                    scope["path"] = original_path
                    print(f"[debug-routing] Overrode ASGI scope path to: {scope['path']}")
                else:
                    # Fallback to query params if Vercel mapped path parameters
                    query_string = scope.get("query_string", b"").decode("utf-8")
                    if "path=" in query_string:
                        # Extract the path parameter from query parameters
                        from urllib.parse import parse_qs
                        params = parse_qs(query_string)
                        if "path" in params and params["path"]:
                            # Reconstruct path as /api/ + path
                            val = params["path"][0]
                            scope["path"] = f"/api/{val.lstrip('/')}"
                            print(f"[debug-routing] Fallback query param path override to: {scope['path']}")
                    
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
