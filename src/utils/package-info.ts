/**
 * Package information utility - Refactored for testability
 *
 * This module provides a simple way to get package.json information
 * without using problematic JSON import assertions.
 *
 * Refactored to allow dependency injection for better testability.
 */

import fs from 'node:fs';
import path from 'node:path';

// Cache for package.json data
let _packageInfo: any = null;

  // Default dependencies that can be overridden in tests
  let dependencies = {
    fs,
    path,
    // Function to load package.json using ES module compatible methods
    loadPackageJson: async (): Promise<any> => {
      try {
        // Strategy 1: Use fs.readFileSync with relative path
        // This works in both ES modules and CommonJS
        const packagePath = path.resolve(process.cwd(), 'package.json');
        const content = fs.readFileSync(packagePath, 'utf8');
        return JSON.parse(content);
      } catch (error1) {
        try {
          // Strategy 2: Try to find package.json in parent directories
          let currentDir = __dirname;
          for (let i = 0; i < 10; i++) {
            const packagePath = path.resolve(currentDir, 'package.json');
            if (fs.existsSync(packagePath)) {
              const content = fs.readFileSync(packagePath, 'utf8');
              return JSON.parse(content);
            }
            currentDir = path.dirname(currentDir);
            if (currentDir === '/') break;
          }
          
          // Strategy 3: Fallback to environment variables or defaults
          return {
            name: process.env.npm_package_name || '@mcpilotx/intentorch',
            version: process.env.npm_package_version || '0.7.2',
            description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit',
          };
        } catch (error2) {
          // Strategy 4: Final fallback
          return {
            name: process.env.npm_package_name || '@mcpilotx/intentorch',
            version: process.env.npm_package_version || '0.7.2',
            description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit',
          };
        }
      }
    },
  };

/**
 * Set dependencies for testing
 */
export function setDependencies(newDeps: Partial<typeof dependencies>) {
  // Create a new loadPackageJson function that uses the new dependencies
  const newLoadPackageJson = async (): Promise<any> => {
    const deps = dependencies; // Capture current dependencies
    try {
      const packagePath = deps.path.resolve(process.cwd(), 'package.json');
      const content = deps.fs.readFileSync(packagePath, 'utf8');
      return JSON.parse(content);
    } catch (error1) {
      try {
        let currentDir = __dirname;
        for (let i = 0; i < 10; i++) {
          const packagePath = deps.path.resolve(currentDir, 'package.json');
          if (deps.fs.existsSync(packagePath)) {
            const content = deps.fs.readFileSync(packagePath, 'utf8');
            return JSON.parse(content);
          }
          currentDir = deps.path.dirname(currentDir);
          if (currentDir === '/') {break;}
        }

        return {
          name: process.env.npm_package_name || '@mcpilotx/intentorch',
          version: process.env.npm_package_version || '0.7.2',
          description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit',
        };
      } catch (error2) {
        return {
          name: process.env.npm_package_name || '@mcpilotx/intentorch',
          version: process.env.npm_package_version || '0.7.2',
          description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit',
        };
      }
    }
  };

  // Merge with new dependencies, using the new loadPackageJson if not provided
  dependencies = {
    fs: newDeps.fs || dependencies.fs,
    path: newDeps.path || dependencies.path,
    loadPackageJson: newDeps.loadPackageJson || newLoadPackageJson,
  };
}

/**
 * Reset dependencies to defaults
 */
export function resetDependencies() {
  // Capture the current fs and path imports
  const currentFs = fs;
  const currentPath = path;

  dependencies = {
    fs: currentFs,
    path: currentPath,
    loadPackageJson: async (): Promise<any> => {
      try {
        const packagePath = currentPath.resolve(process.cwd(), 'package.json');
        const content = currentFs.readFileSync(packagePath, 'utf8');
        return JSON.parse(content);
      } catch (error1) {
        try {
          let currentDir = __dirname;
          for (let i = 0; i < 10; i++) {
            const packagePath = currentPath.resolve(currentDir, 'package.json');
            if (currentFs.existsSync(packagePath)) {
              const content = currentFs.readFileSync(packagePath, 'utf8');
              return JSON.parse(content);
            }
            currentDir = currentPath.dirname(currentDir);
            if (currentDir === '/') {break;}
          }

          return {
            name: process.env.npm_package_name || '@mcpilotx/intentorch',
            version: process.env.npm_package_version || '0.7.2',
            description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit',
          };
        } catch (error2) {
          return {
            name: process.env.npm_package_name || '@mcpilotx/intentorch',
            version: process.env.npm_package_version || '0.7.2',
            description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit',
          };
        }
      }
    },
  };
}

/**
 * Clear the package info cache
 */
export function clearCache() {
  _packageInfo = null;
}

/**
 * Load package.json using the most compatible method
 */
export async function loadPackageInfo(): Promise<any> {
  if (_packageInfo) {
    return _packageInfo;
  }

  try {
    _packageInfo = await dependencies.loadPackageJson();
    return _packageInfo;
  } catch (error) {
    // Fallback to environment variables or defaults
    _packageInfo = {
      name: process.env.npm_package_name || '@mcpilotx/intentorch',
      version: process.env.npm_package_version || '0.7.2',
      description: process.env.npm_package_description || 'Intent-Driven MCP Orchestration Toolkit',
    };
    return _packageInfo;
  }
}

/**
 * Get package version - simple synchronous function
 */
export async function getPackageVersion(): Promise<string> {
  const info = await loadPackageInfo();
  return info.version;
}

/**
 * Get package name
 */
export async function getPackageName(): Promise<string> {
  const info = await loadPackageInfo();
  return info.name;
}

/**
 * Get package description
 */
export async function getPackageDescription(): Promise<string> {
  const info = await loadPackageInfo();
  return info.description || '';
}

/**
 * Get full package info
 */
export async function getPackageInfo(): Promise<any> {
  return await loadPackageInfo();
}

// Export default
export default {
  getPackageVersion,
  getPackageName,
  getPackageDescription,
  getPackageInfo,
  // Expose testability functions
  setDependencies,
  resetDependencies,
  clearCache,
  loadPackageInfo,
};
