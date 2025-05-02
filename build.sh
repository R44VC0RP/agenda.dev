#!/bin/bash

# Simple script to build Tauri app without xattr issues
set -e

echo "Building Tauri app..."

# Create a minimal HTML file for the frontend
mkdir -p out
cat > out/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda Desktop</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .container {
      max-width: 800px;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Agenda</h1>
    <p>Loading application...</p>
  </div>
</body>
</html>
EOL

# Create desktop directory and files
mkdir -p out/desktop
cp out/index.html out/desktop/index.html

# Skip the Next.js build step entirely and build directly with Cargo
echo "Building Tauri with Cargo directly..."
cd src-tauri
cargo build --release

# Check if the binary was created
if [ ! -f "target/release/agenda" ]; then
  echo "Error: Binary not found. Build failed completely."
  exit 1
fi

echo "Binary built successfully at: target/release/agenda"

# Use Tauri's built-in bundling tools for creating platform-specific packages
cd ..
echo "Creating application bundle using Tauri's bundler..."

# Check for the presence of Tauri CLI
if ! command -v cargo tauri &> /dev/null; then
  echo "Installing Tauri CLI..."
  cargo install tauri-cli
fi

# Create bundle using Tauri's built-in bundler (works cross-platform)
# This handles proper app signing, entitlements, and platform-specific requirements
cargo tauri build

# The bundled app will be available at:
# - macOS: src-tauri/target/release/bundle/macos/Agenda.app
# - Windows: src-tauri/target/release/bundle/msi/Agenda_x.y.z_x64.msi
# - Linux: src-tauri/target/release/bundle/appimage/agenda_x.y.z_amd64.AppImage
BUNDLE_DIR="src-tauri/target/release/bundle"

echo "Build completed successfully!"
echo "App bundle created at: $BUNDLE_DIR"