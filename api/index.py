"""
Vercel Serverless Function Entrypoint
Exports the ASGI FastAPI application instance for Vercel.
"""

from app.main import app

# Vercel serverless handler instance
app = app
