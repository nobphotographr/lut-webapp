#!/bin/bash
echo "Starting 3D LUT Web Application..."
echo "Please try one of these URLs:"
echo ""
echo "1. http://localhost:4000 (serve)"
echo "2. http://localhost:3000 (Next.js)"
echo "3. http://localhost:8080 (Next.js dev)"
echo ""

# Kill any existing processes
pkill -f "next dev" 2>/dev/null
pkill -f "serve" 2>/dev/null

# Start serve on port 4000
echo "Starting serve on port 4000..."
npx serve -l 4000 . &

# Give it a moment to start
sleep 2

echo "Server should be running on http://localhost:4000"
echo "Press Ctrl+C to stop the server"

# Keep script running
wait