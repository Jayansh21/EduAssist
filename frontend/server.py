#!/usr/bin/env python3
"""
Simple HTTP server with URL rewriting for EduAssist frontend
"""

import http.server
import socketserver
import urllib.parse
import os
from pathlib import Path

class EduAssistHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Handle root path - redirect to login
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/login.html')
            self.end_headers()
            return
        
        # Handle routes without .html extension
        elif path == '/quiz':
            path = '/quiz.html'
        elif path == '/chat':
            path = '/chat.html'
        elif path == '/upload':
            path = '/index.html'
        elif path == '/flashcards':
            path = '/flashcards.html'
            
        # Update the path
        self.path = path
        
        # Call the parent handler
        return super().do_GET()

def run_server(port=3001):
    """Run the EduAssist frontend server"""
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("", port), EduAssistHTTPRequestHandler) as httpd:
        print(f"🌐 EduAssist Frontend Server running at http://localhost:{port}/")
        print(f"📄 Pages available:")
        print(f"   - Login: http://localhost:{port}/")
        print(f"   - Upload Content: http://localhost:{port}/upload")
        print(f"   - Quiz Generator: http://localhost:{port}/quiz")
        print(f"   - AI Chatbot: http://localhost:{port}/chat")
        print(f"   - Flashcards: http://localhost:{port}/flashcards")
        print(f"\n🔧 Backend should be running at http://localhost:8000/")
        print(f"Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped")

if __name__ == "__main__":
    run_server()
