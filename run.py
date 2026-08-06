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
    port = find_available_port(8000)
    print(f"[+] Starting BSR Bengali Restaurant FastAPI Server on Port {port}...")
    print(f"[+] Website Portal: http://127.0.0.1:{port}/")
    print(f"[+] Admin Security Hardened Portal: http://127.0.0.1:{port}/admin.html")
    print(f"[+] API Documentation: http://127.0.0.1:{port}/docs")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=True)
