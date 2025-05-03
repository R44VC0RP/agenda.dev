#!/usr/bin/env bun

/**
 * Custom build script for the desktop app
 * This script will:
 * 1. Copy only desktop-related pages and components
 * 2. Create a minimal Next.js app without API routes
 * 3. Build it using Next.js static export
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Create a temporary build directory
const tempDir = path.join(process.cwd(), 'desktop-build-temp');
const appDir = path.join(tempDir, 'app');
const componentsDir = path.join(tempDir, 'components');
const libDir = path.join(tempDir, 'lib');
const stylesDir = path.join(tempDir, 'styles');
const publicDir = path.join(tempDir, 'public');
const hooksDir = path.join(tempDir, 'hooks');

// Clean up previous build if exists
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// Create directory structure
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(appDir, { recursive: true });
fs.mkdirSync(componentsDir, { recursive: true });
fs.mkdirSync(libDir, { recursive: true });
fs.mkdirSync(stylesDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(hooksDir, { recursive: true });

// Copy the desktop app files
console.log('Copying desktop app files...');

// Copy configuration files
fs.copyFileSync('next.config.mjs', path.join(tempDir, 'next.config.mjs'));
fs.copyFileSync('tailwind.config.ts', path.join(tempDir, 'tailwind.config.ts'));
fs.copyFileSync('postcss.config.mjs', path.join(tempDir, 'postcss.config.mjs'));
fs.copyFileSync('tsconfig.json', path.join(tempDir, 'tsconfig.json'));
fs.copyFileSync('package.json', path.join(tempDir, 'package.json'));
fs.copyFileSync('.env', path.join(tempDir, '.env'));

// Read from a desktop-specific env file if it exists, or create one
let envLocal = 'NEXT_PUBLIC_IS_DESKTOP=true\n';
if (fs.existsSync('.env.desktop')) {
  envLocal = fs.readFileSync('.env.desktop', 'utf8') + '\n' + envLocal;
} else {
  envLocal = `
# Desktop app environment variables
NEXT_PUBLIC_BETTER_AUTH_BASE_URL=https://agenda.dev
BETTER_AUTH_URL=https://agenda.dev
${envLocal}`;
}
fs.writeFileSync(path.join(tempDir, '.env.local'), envLocal);

// Copy desktop app pages
fs.mkdirSync(path.join(appDir, 'desktop'), { recursive: true });
copyRecursive('app/desktop', path.join(appDir, 'desktop'));
copyRecursive('app/layout.tsx', path.join(appDir, 'layout.tsx'));
copyRecursive('app/globals.css', path.join(appDir, 'globals.css'));
copyRecursive('app/HomeClient.tsx', path.join(appDir, 'HomeClient.tsx'));

// Create a root index page that redirects to desktop
const indexPage = `
'use client';

import { useEffect } from 'react';

export default function IndexPage() {
  useEffect(() => {
    // Redirect to desktop route immediately
    window.location.href = '/desktop';
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      <p className="ml-3 text-gray-700 dark:text-gray-300">Loading desktop app...</p>
    </div>
  );
}
`;

fs.writeFileSync(path.join(appDir, 'page.tsx'), indexPage);

// Copy required components
copyRecursive('components', componentsDir);

// Copy required lib files
// Define critical files that must exist for the build to succeed
const criticalFiles = [
  ['lib/utils.ts', path.join(libDir, 'utils.ts')],
  ['lib/tauri-api.ts', path.join(libDir, 'tauri-api.ts')],
  ['lib/types.ts', path.join(libDir, 'types.ts')],
  ['lib/date-utils.ts', path.join(libDir, 'date-utils.ts')],
  ['lib/timezone-utils.ts', path.join(libDir, 'timezone-utils.ts')],
  ['lib/auth-client.ts', path.join(libDir, 'auth-client.ts')],
  ['lib/auth.ts', path.join(libDir, 'auth.ts')],
  ['auth-schema.ts', path.join(tempDir, 'auth-schema.ts')],
];

// Copy critical files and validate their existence
let missingFiles = [];
for (const [source, dest] of criticalFiles) {
  if (!fs.existsSync(path.join(process.cwd(), source))) {
    missingFiles.push(source);
  } else {
    copyRecursive(source, dest);
  }
}

// Exit if any critical files are missing
if (missingFiles.length > 0) {
  console.error('Error: The following critical files are missing:');
  missingFiles.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

// Copy styles
copyRecursive('styles', stylesDir);

// Copy hooks
copyRecursive('hooks', hooksDir);

// Copy public files
copyRecursive('public', publicDir);

// Create desktop-specific Next.js config by extending the existing config
const desktopNextConfig = `// Import original Next.js config
import originalConfig from '../next.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...originalConfig,
  
  // Desktop-specific overrides
  output: 'export',
  distDir: '../out',
  
  // No basePath for desktop
  basePath: '',
  assetPrefix: '',
  
  // Ensure trailing slashes for proper linking
  trailingSlash: true,
  
  // Enhance webpack config to add process polyfill
  webpack(config) {
    // Start with original webpack config function if it exists
    const originalWebpack = originalConfig.webpack;
    if (originalWebpack) {
      config = originalWebpack(config);
    }
    
    // Add additional desktop-specific polyfills
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'process': 'process/browser',
    };
    
    return config;
  },
};

export default nextConfig;
`;

fs.writeFileSync(path.join(tempDir, 'next.config.mjs'), desktopNextConfig);

// Run Next.js build in the temp directory
console.log('Building desktop app with Next.js...');
const originalDir = process.cwd();
try {
  process.chdir(tempDir);
  execSync('bun run next build', { stdio: 'inherit' });
  console.log('Next.js build completed successfully!');
} catch (error) {
  console.error('Next.js build failed:', error);
  process.chdir(originalDir);
  process.exit(1);
} finally {
  process.chdir(originalDir);
}

// Ensure index.html is in the right place
console.log('Finalizing build files...');

// Get the correct out directory path
const outDir = path.join(process.cwd(), 'out');

// Make sure out directory exists
if (!fs.existsSync(outDir)) {
  console.log('Creating out directory');
  fs.mkdirSync(outDir, { recursive: true });
}

// List the files in the out directory to debug
console.log('Files in out directory:');
try {
  console.log(fs.readdirSync(outDir));
} catch (error) {
  console.log('Error reading out directory:', error.message);
}

// Create HTML redirects to ensure the Tauri app loads correctly
console.log('Creating index.html in root directory');
// Create a simple index.html that redirects to the desktop app
const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda Desktop</title>
  <script>
    window.location.href = './desktop/';
  </script>
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
    .spinner {
      display: inline-block;
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0,0,0,0.1);
      border-radius: 50%;
      border-top-color: #7c5aff;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Agenda</h1>
    <p>Loading desktop app...</p>
    <div class="spinner"></div>
  </div>
</body>
</html>
`;

// Write the index.html file to the out directory
fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml);

// Clean up temp directory after ensuring output files are correct
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('Desktop build completed successfully! Output in "./out" directory:');
try {
  console.log(fs.readdirSync(outDir));
} catch (error) {
  console.log('Error reading out directory:', error.message);
}

// Helper function to copy files and directories recursively
function copyRecursive(source, destination) {
  const fullSourcePath = path.join(process.cwd(), source);

  if (!fs.existsSync(fullSourcePath)) {
    console.warn(`Warning: Source path does not exist: ${fullSourcePath}`);
    return;
  }

  if (fs.statSync(fullSourcePath).isDirectory()) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(fullSourcePath);
    for (const file of files) {
      const srcFile = path.join(fullSourcePath, file);
      const destFile = path.join(destination, file);

      if (fs.statSync(srcFile).isDirectory()) {
        copyRecursive(path.join(source, file), destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  } else {
    fs.copyFileSync(fullSourcePath, destination);
  }
}
