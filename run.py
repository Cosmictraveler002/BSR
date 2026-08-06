import os
import socket
import uvicorn

def find_available_port(start_port=8000, max_attempts=10):
    """Finds the first available TCP port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return start_port

if __name__ == "__main__":
    env_port = os.environ.get("PORT")
    if env_port:
        port = int(env_port)
        host = "0.0.0.0"
        reload_mode = False
    else:
        port = find_available_port(8000)
        host = "127.0.0.1"
        reload_mode = True

    print(f"[+] Starting BSR Bengali Restaurant FastAPI Server on Host {host}, Port {port}...")
    print(f"[+] Website Portal: http://{host}:{port}/")
    print(f"[+] Admin Security Hardened Portal: http://{host}:{port}/admin.html")
    print(f"[+] API Documentation: http://{host}:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload_mode)
