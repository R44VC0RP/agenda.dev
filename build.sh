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

# Create macOS app bundle
echo "Creating macOS app bundle..."
cd ..

# Create app bundle directory structure
BUNDLE_DIR="src-tauri/target/release/bundle/macos/Agenda.app"
mkdir -p "$BUNDLE_DIR/Contents/"{MacOS,Resources}

# Copy the binary
cp src-tauri/target/release/agenda "$BUNDLE_DIR/Contents/MacOS/"

# Copy the icon
cp src-tauri/icons/icon.icns "$BUNDLE_DIR/Contents/Resources/" 2>/dev/null || echo "Icon not found, skipping..."

# Create Info.plist
cat > "$BUNDLE_DIR/Contents/Info.plist" << 'EOL'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>Agenda</string>
    <key>CFBundleExecutable</key>
    <string>agenda</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>CFBundleIdentifier</key>
    <string>dev.agenda.app</string>
    <key>CFBundleName</key>
    <string>Agenda</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
</dict>
</plist>
EOL

echo "Build completed successfully!"
echo "App bundle created at: $BUNDLE_DIR"