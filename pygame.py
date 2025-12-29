# import os
# import http.server
# import socketserver
# import threading
# import webview

# # Define a custom HTTP request handler to support SPA routing
# class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
#     def do_GET(self):
#         # Serve the file if it exists; otherwise load index.html for client-side routing.
#         file_path = self.translate_path(self.path)
#         if os.path.exists(file_path) and os.path.isfile(file_path):
#             super().do_GET()
#         else:
#             self.path = '/index.html'
#             super().do_GET()

# def run_server():
#     PORT = 8081
#     DIRECTORY = "dist"  # Ensure this is the folder with your built React/Vite app

#     # Change directory to where your built files reside
#     os.chdir(DIRECTORY)
    
#     with socketserver.TCPServer(("", PORT), SPARequestHandler) as httpd:
#         print(f"Serving your PyGame at http://localhost:{PORT}")
#         httpd.serve_forever()

# def main():
#     # Start the HTTP server in a separate thread so it won't block the GUI.
#     server_thread = threading.Thread(target=run_server, daemon=True)
#     server_thread.start()
    
#     # Create and show the desktop window using PyWebView.
#     # This points to your locally running server.
#     window = webview.create_window("PyGame", "http://localhost:8081")
    
#     # Start the GUI event loop (this call is what keeps the window open).
#     webview.start()

# if __name__ == '__main__':
#     main()

import os
import pygame
import http.server
import socketserver
import threading
import webview
import platform

# Define a custom HTTP request handler to support SPA routing
class SPARequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve the file if it exists; otherwise load index.html for client-side routing.
        file_path = self.translate_path(self.path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            super().do_GET()
        else:
            self.path = '/index.html'
            super().do_GET()

def run_server():
    PORT = 8081
    DIRECTORY = "dist"  # Folder with your built React/Vite app

    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), SPARequestHandler) as httpd:
        print(f"Serving your PyGame at http://localhost:{PORT}")
        httpd.serve_forever()

def inject_key_debug_js(window):
    # Optional: Inject JavaScript to confirm key events are working
    js = """
    document.addEventListener('keydown', function(e) {
        console.log('Key pressed:', e.key);
    });
    """
    window.evaluate_js(js)

def main():
    # Start HTTP server in a separate thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Detect OS and choose best GUI backend
    system = platform.system()
    gui_backend = 'qt' if system != 'Windows' else 'edgechromium'

    # Create the webview window
    window = webview.create_window("PyGame", "http://localhost:8080", confirm_close=True)

    # Start the webview with debug mode and chosen GUI
    webview.start(func=lambda: inject_key_debug_js(window), debug=True, gui=gui_backend)

if __name__ == '__main__':
    main()
