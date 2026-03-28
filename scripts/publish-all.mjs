#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const PACKAGES_DIR = './packages';

const SKIP_PACKAGES = [
  'studio-desktop',  // Electron app, tidak untuk NPM
  'dashboard',       // Server dashboard, tidak untuk NPM
  'vscode',          // VS Code extension, perlu proses berbeda
  'atomic',         // Internal use only
  'testing',        // Internal testing utilities
  'storybook-addon', // Perlu cek lagi
  'plugin-registry', // Perlu cek lagi
];

const PACKAGES_TO_PUBLISH = [
  'core',           // tailwind-styled-v4
  'shared',
  'compiler',
  'engine',
  'scanner',
  'plugin',
  'theme',
  'animate',
  'preset',
  'runtime',
  'runtime-css',
  'analyzer',
  'vite',
  'next',
  'rspack',
  'vue',
  'svelte',
  'cli',           // create-tailwind-styled
];

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function getPackageName(packageDir) {
  const packageJsonPath = join(PACKAGES_DIR, packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) return null;
  
  const content = require('fs').readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(content);
  return pkg.name;
}

function getPackageVersion(packageDir) {
  const packageJsonPath = join(PACKAGES_DIR, packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) return null;
  
  const content = require('fs').readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(content);
  return pkg.version;
}

function isBuilt(packageDir) {
  const packageJsonPath = join(PACKAGES_DIR, packageDir, 'dist', 'package.json');
  return existsSync(packageJsonPath);
}

async function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    try {
      execSync(command, {
        cwd,
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

async function publishPackage(packageDir) {
  const packageName = getPackageName(packageDir);
  const version = getPackageVersion(packageDir);
  const packagePath = join(process.cwd(), PACKAGES_DIR, packageDir);
  
  if (!packageName) {
    log(`Skipping ${packageDir}: No package.json found`, 'warn');
    return false;
  }
  
  if (SKIP_PACKAGES.includes(packageDir)) {
    log(`Skipping ${packageDir}: Listed in SKIP_PACKAGES`, 'warn');
    return false;
  }
  
  log(`\n${'='.repeat(60)}`);
  log(`Publishing: ${packageName}@${version}`);
  log(`${'='.repeat(60)}`);
  
  // Check if built
  if (!isBuilt(packageDir)) {
    log(`Building ${packageDir} first...`, 'warn');
    try {
      execSync('npm run build', { cwd: packagePath, stdio: 'inherit' });
    } catch (e) {
      log(`Failed to build ${packageDir}: ${e.message}`, 'error');
      return false;
    }
  }
  
  // Determine access flag
  const isScoped = packageName.startsWith('@');
  const accessFlag = isScoped ? '--access public' : '';
  
  try {
    execSync(`npm publish ${accessFlag}`, { cwd: packagePath, stdio: 'inherit' });
    log(`Successfully published ${packageName}@${version}`, 'success');
    return true;
  } catch (e) {
    log(`Failed to publish ${packageName}: ${e.message}`, 'error');
    return false;
  }
}

async function main() {
  log('🚀 Starting publish process for all packages', 'info');
  log(`\nPackages to publish: ${PACKAGES_TO_PUBLISH.length}`, 'info');
  log(`Packages to skip: ${SKIP_PACKAGES.length}`, 'info');
  
  // Check if logged in
  try {
    execSync('npm whoami', { stdio: 'pipe' });
    log('✅ Already logged in to NPM', 'success');
  } catch (e) {
    log('❌ Not logged in to NPM. Please run: npm login', 'error');
    process.exit(1);
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const packageDir of PACKAGES_TO_PUBLISH) {
    const packagePath = join(process.cwd(), PACKAGES_DIR, packageDir);
    
    if (!existsSync(packagePath)) {
      log(`Package directory ${packageDir} not found`, 'warn');
      continue;
    }
    
    try {
      const success = await publishPackage(packageDir);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (e) {
      log(`Error publishing ${packageDir}: ${e.message}`, 'error');
      failCount++;
    }
  }
  
  log(`\n${'='.repeat(60)}`);
  log(`📊 Publish Summary`);
  log(`${'='.repeat(60)}`);
  log(`✅ Successful: ${successCount}`, 'success');
  log(`❌ Failed: ${failCount}`, failCount > 0 ? 'error' : 'info');
  log(`${'='.repeat(60)}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(e => {
  log(`Fatal error: ${e.message}`, 'error');
  process.exit(1);
});
