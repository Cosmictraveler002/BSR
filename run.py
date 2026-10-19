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

    display_host = "localhost" if host == "0.0.0.0" else host

    print(f"[+] Starting BSR Bengali Restaurant FastAPI Server on Host {host}, Port {port}...")
    print(f"[+] Website Portal: http://{display_host}:{port}/ (or http://127.0.0.1:{port}/)")
    print(f"[+] Admin Security Hardened Portal: http://{display_host}:{port}/admin")
    print(f"[+] API Documentation: http://{display_host}:{port}/docs")
    if host == "0.0.0.0":
        print(f"[i] Windows Note: Access via http://localhost:{port}/ or http://127.0.0.1:{port}/ (do not use 0.0.0.0 in browser)")
    uvicorn.run("app.main:app", host=host, port=port, reload=reload_mode)
