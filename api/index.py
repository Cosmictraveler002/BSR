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
                
                # Debug logging to stdout (visible in Vercel Logs dashboard)
                headers_str = {k.decode("utf-8", errors="ignore"): v.decode("utf-8", errors="ignore") for k, v in headers.items()}
                print(f"[debug-routing] Path: {scope.get('path')} | Headers: {headers_str}")
                
                # Check for Vercel original request path header
                matched_path = headers.get(b"x-matched-path")
                if matched_path:
                    scope["path"] = matched_path.decode("utf-8")
                    print(f"[debug-routing] Overrode path using x-matched-path: {scope['path']}")
                else:
                    # Alternative header check
                    route_matches = headers.get(b"x-now-route-matches")
                    print(f"[debug-routing] x-matched-path not found. x-now-route-matches: {route_matches}")
                    
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
