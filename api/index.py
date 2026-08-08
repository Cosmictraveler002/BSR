"""
Temporary Diagnostic Entry Point
Tests if the basic Vercel Python runtime and FastAPI serve requests.
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="BSR Diagnostic Test")

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"])
def diagnostic_handler(full_path: str):
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "message": "FastAPI is running successfully on Vercel!",
            "path_requested": full_path
        }
    )
