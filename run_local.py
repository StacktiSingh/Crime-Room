#!/usr/bin/env python3
"""
Local development server for CrimeRoom
Run this file to test your app locally before deploying
"""

import os
from main import app, socketio

if __name__ == '__main__':
    print("🚀 Starting CrimeRoom locally...")
    print("📱 Open your browser to: http://localhost:5000")
    print("🔧 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    # Set development environment
    os.environ['FLASK_ENV'] = 'development'
    
    # Run with debug mode for local development
    socketio.run(
        app, 
        host='127.0.0.1', 
        port=5000, 
        debug=True,
        use_reloader=True
    )