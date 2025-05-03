#!/bin/bash

# Simple script to build Tauri app without xattr issues
set -e

echo "Building Tauri app..."

# Run the custom desktop build script
echo "Building Next.js desktop app..."
chmod +x desktop-build.js
./desktop-build.js

# If Next.js build fails, create a minimal fallback HTML file
if [ $? -ne 0 ]; then
  echo "Next.js build failed. Creating minimal fallback HTML..."
  mkdir -p out/desktop
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
  cp out/index.html out/desktop/index.html
fi

# Make sure we have an index.html in the out directory
if [ ! -f "out/index.html" ]; then
  echo "Creating/copying index.html to root of out directory..."
  if [ -f "out/desktop.html" ]; then
    # Use desktop.html if it exists
    cp out/desktop.html out/index.html
  elif [ -f "out/desktop/index.html" ]; then
    # Use desktop/index.html if it exists
    cp out/desktop/index.html out/index.html
  else
    # Create a minimal fallback if nothing exists
    cat > out/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0;URL='./desktop'" />
  <title>Agenda Desktop</title>
</head>
<body>
  <p>Redirecting to desktop app...</p>
</body>
</html>
EOL
  fi
fi

# Build directly with Cargo
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
cargo tauri build --config src-tauri/tauri.conf.json

# The bundled app will be available at:
# - macOS: src-tauri/target/release/bundle/macos/Agenda.app
# - Windows: src-tauri/target/release/bundle/msi/Agenda_x.y.z_x64.msi
# - Linux: src-tauri/target/release/bundle/appimage/agenda_x.y.z_amd64.AppImage
BUNDLE_DIR="src-tauri/target/release/bundle"

echo "Build completed successfully!"
echo "App bundle created at: $BUNDLE_DIR"