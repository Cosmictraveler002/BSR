"""
Vercel Serverless Entry Point
Exports the FastAPI ASGI app for Vercel's Python runtime.
"""
import sys
import os

# Ensure root directory is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from app.main import app
except Exception as e:
    import traceback
    print(f"[!] Critical error loading app.main in api/index.py: {e}")
    traceback.print_exc()
    raise e
