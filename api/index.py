"""
Vercel Serverless Entry Point
Exports the FastAPI ASGI app for Vercel's Python runtime.
Includes VercelPathMiddleware to handle original request paths in ASGI scope.
"""
import sys
import os

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
                # Vercel passes the original requested path in x-matched-path header
                matched_path = headers.get(b"x-matched-path")
                if matched_path:
                    scope["path"] = matched_path.decode("utf-8")
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
