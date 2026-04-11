/**
 * Package information utility - Simple and compatible solution
 * 
 * This module provides a simple way to get package.json information
 * without using problematic JSON import assertions.
 * 
 * The solution: Use TypeScript's resolveJsonModule with a simple require wrapper
 */

// Cache for package.json data
let _packageInfo: any = null;

/**
 * Load package.json using the most compatible method
 */
function loadPackageInfo(): any {
  if (_packageInfo) {
    return _packageInfo;
  }
  
  try {
    // Strategy 1: Direct require (works in CJS and with ts-node)
    // This works because TypeScript's resolveJsonModule is enabled
    _packageInfo = require('../../package.json');
    return _packageInfo;
  } catch (error1) {
    try {
      // Strategy 2: Use fs.readFileSync as fallback
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.resolve(__dirname, '../../package.json');
      const content = fs.readFileSync(packagePath, 'utf8');
      _packageInfo = JSON.parse(content);
      return _packageInfo;
    } catch (error2) {
      // Strategy 3: Fallback to environment variables or defaults
      _packageInfo = {
        name: process.env.npm_package_name || '@mcpilotx/intentorch',
        version: process.env.npm_package_version || '0.7.0',
        description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit'
      };
      return _packageInfo;
    }
  }
}

/**
 * Get package version - simple synchronous function
 */
export function getPackageVersion(): string {
  const info = loadPackageInfo();
  return info.version;
}

/**
 * Get package name
 */
export function getPackageName(): string {
  const info = loadPackageInfo();
  return info.name;
}

/**
 * Get package description
 */
export function getPackageDescription(): string {
  const info = loadPackageInfo();
  return info.description || '';
}

/**
 * Get full package info
 */
export function getPackageInfo(): any {
  return loadPackageInfo();
}

// Export default
export default {
  getPackageVersion,
  getPackageName,
  getPackageDescription,
  getPackageInfo
};