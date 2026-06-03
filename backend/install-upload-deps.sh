#!/bin/bash
# Install missing dependencies for file upload feature

echo "Installing python-multipart for file upload support..."

cd "$(dirname "$0")"
source venv/bin/activate

pip install python-multipart==0.0.6

if [ $? -eq 0 ]; then
    echo "✅ python-multipart installed successfully!"
    echo "You can now restart the backend server."
else
    echo "❌ Installation failed. Please try:"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   pip install python-multipart"
fi
