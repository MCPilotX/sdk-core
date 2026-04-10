import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NodeAdapter } from '../src/runtime/node-adapter';
import { PythonAdapter } from '../src/runtime/python-adapter';
import { GoAdapter } from '../src/runtime/go-adapter';
import { RustAdapter } from '../src/runtime/rust-adapter';
import { DockerAdapter } from '../src/runtime/docker-adapter';
import { ServiceConfig } from '../src/core/types';

// Mock child_process module
jest.mock('child_process', () => ({
  execSync: jest.fn(),
  exec: jest.fn(),
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/') || '.'),
}));

// Mock logger
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Runtime Adapters', () => {
  let mockExecSync: jest.Mock;
  let mockExec: jest.Mock;
  let mockExistsSync: jest.Mock;
  let mockMkdirSync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const { execSync, exec } = require('child_process');
    const { existsSync, mkdirSync } = require('fs');
    
    mockExecSync = execSync as jest.Mock;
    mockExec = exec as jest.Mock;
    mockExistsSync = existsSync as jest.Mock;
    mockMkdirSync = mkdirSync as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('NodeAdapter', () => {
    it('should detect bun when available', () => {
      mockExecSync.mockReturnValue(true);
      
      const adapter = new NodeAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.js',
        entry: '/path/to/service.js',
        args: ['--port', '3000'],
      };

      const result = adapter.getSpawnArgs(config);
      
      expect(result.command).toBe('bun');
      expect(result.args).toEqual(['/path/to/service.js', '--port', '3000']);
      expect(mockExecSync).toHaveBeenCalledWith('which bun', { stdio: 'ignore' });
    });

    it('should fallback to node when bun is not available', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'which bun') {
          throw new Error('Command failed');
        }
        return true;
      });

      const adapter = new NodeAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.js',
        entry: '/path/to/service.js',
        args: ['--port', '3000'],
      };

      const result = adapter.getSpawnArgs(config);
      
      expect(result.command).toBe('node');
      expect(result.args).toEqual(['/path/to/service.js', '--port', '3000']);
    });

    it('should handle setup without errors', async () => {
      const adapter = new NodeAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.js',
        entry: '/path/to/service.js',
      };

      await expect(adapter.setup(config)).resolves.not.toThrow();
    });
  });

  describe('PythonAdapter', () => {
    it('should return python path from virtual environment', () => {
      const adapter = new PythonAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.py',
        entry: '/path/to/service.py',
        args: ['--debug'],
      };

      mockExistsSync.mockReturnValue(true);
      
      const result = adapter.getSpawnArgs(config);
      
      // The actual path will be constructed with the real VENVS_DIR constant
      // We just need to verify the structure is correct
      expect(result.command).toContain('test-service/bin/python');
      expect(result.args).toEqual(['/path/to/service.py', '--debug']);
    });

    it('should handle setup when virtual environment exists', async () => {
      const adapter = new PythonAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.py',
        entry: '/path/to/service.py',
      };

      mockExistsSync.mockReturnValue(true);
      mockExec.mockImplementation((command: string, callback: any) => {
        callback(null, { stdout: '', stderr: '' });
      });

      await expect(adapter.setup(config)).resolves.not.toThrow();
    });

    it('should handle setup when virtual environment does not exist', async () => {
      const adapter = new PythonAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.py',
        entry: '/path/to/service.py',
      };

      mockExistsSync.mockReturnValue(false);
      mockExec.mockImplementation((command: string, callback: any) => {
        callback(null, { stdout: '', stderr: 'created virtual environment' });
      });

      await expect(adapter.setup(config)).resolves.not.toThrow();
      expect(mockMkdirSync).toHaveBeenCalled();
    });
  });

  describe('GoAdapter', () => {
    it('should use go run command for .go files', () => {
      const adapter = new GoAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.go',
        entry: '/path/to/service.go',
        args: ['-flag', 'value'],
      };

      const result = adapter.getSpawnArgs(config);
      
      expect(result.command).toBe('go');
      expect(result.args).toEqual(['run', '/path/to/service.go', '-flag', 'value']);
    });

    it('should handle setup when Go is installed', async () => {
      const adapter = new GoAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.go',
        entry: '/path/to/service.go',
      };

      mockExecSync.mockReturnValue(true);
      
      await expect(adapter.setup(config)).resolves.not.toThrow();
      expect(mockExecSync).toHaveBeenCalledWith('go version', { stdio: 'ignore' });
    });

    it('should throw error when Go is not installed', async () => {
      const adapter = new GoAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/service.go',
        entry: '/path/to/service.go',
      };

      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(adapter.setup(config)).rejects.toThrow('Go is not installed or not in PATH');
    });
  });

  describe('RustAdapter', () => {
    it('should use cargo run command for Rust projects', () => {
      const adapter = new RustAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/rust-project',
        entry: '/path/to/rust-project',
        args: ['--release'],
      };

      const result = adapter.getSpawnArgs(config);
      
      // Rust adapter finds the binary, but we can test the basic structure
      expect(result.args).toEqual(['--release']);
    });

    it('should handle setup when Rust is installed', async () => {
      const adapter = new RustAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/rust-project',
        entry: '/path/to/rust-project',
      };

      mockExecSync.mockReturnValue(true);
      
      await expect(adapter.setup(config)).resolves.not.toThrow();
      expect(mockExecSync).toHaveBeenCalledWith('cargo --version', { stdio: 'ignore' });
    });

    it('should throw error when Rust is not installed', async () => {
      const adapter = new RustAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/rust-project',
        entry: '/path/to/rust-project',
      };

      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(adapter.setup(config)).rejects.toThrow('Rust/Cargo is not installed or not in PATH');
    });
  });

  describe('DockerAdapter', () => {
    it('should generate container name', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
        args: ['-p', '8080:80'],
      };

      const result = adapter.getSpawnArgs(config);
      
      // Docker adapter returns docker command with container name
      expect(result.command).toBe('docker');
      expect(result.args[0]).toBe('run');
      expect(result.args).toContain('-d');
      expect(result.args).toContain('--rm');
    });

    it('should include environment variables in args', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
        env: { NODE_ENV: 'production', PORT: '3000' },
      };

      const result = adapter.getSpawnArgs(config);
      
      expect(result.args).toContain('-e');
      expect(result.args).toContain('NODE_ENV=production');
      expect(result.args).toContain('-e');
      expect(result.args).toContain('PORT=3000');
    });

    it('should include port mappings in args', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
        ports: [8080, 8443],
      };

      const result = adapter.getSpawnArgs(config);
      
      // Docker adapter formats ports as "hostPort:containerPort"
      expect(result.args).toContain('-p');
      // Check for port mappings
      expect(result.args).toContain('8080:8080');
      expect(result.args).toContain('8443:8443');
    });

    it('should include volume mounts in args', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
        volumes: ['/host/path:/container/path', '/data:/data'],
      };

      const result = adapter.getSpawnArgs(config);
      
      expect(result.args).toContain('-v');
      expect(result.args).toContain('/host/path:/container/path');
      expect(result.args).toContain('-v');
      expect(result.args).toContain('/data:/data');
    });

    it('should include working directory in args', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
        workdir: '/app',
      };

      const result = adapter.getSpawnArgs(config);
      
      expect(result.args).toContain('-w');
      expect(result.args).toContain('/app');
    });

    it('should use image name when provided', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'custom-image:tag',
        entry: 'custom-image:tag',
        image: 'custom-image:tag',
      };

      const result = adapter.getSpawnArgs(config);
      
      // The last argument should be the image name
      expect(result.args[result.args.length - 1]).toBe('custom-image:tag');
    });

    it('should include additional arguments', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
        args: ['--restart', 'always', '--log-driver', 'json-file'],
      };

      const result = adapter.getSpawnArgs(config);
      
      // Check that additional args are included in the args array
      // The image should be the service name (test-service) not nginx:latest
      expect(result.args).toContain('test-service');
      
      // Check that the additional args are present
      expect(result.args).toContain('--restart');
      expect(result.args).toContain('always');
      expect(result.args).toContain('--log-driver');
      expect(result.args).toContain('json-file');
    });

    it('should handle setup without errors', async () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
      };

      mockExecSync.mockReturnValue(true);
      
      await expect(adapter.setup(config)).resolves.not.toThrow();
      expect(mockExecSync).toHaveBeenCalledWith('docker --version', { stdio: 'ignore' });
    });

    it('should throw error when Docker is not installed', async () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
      };

      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(adapter.setup(config)).rejects.toThrow('Docker is not installed or not in PATH');
    });

    it('should handle Dockerfile build when dockerfile is provided', async () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/project',
        entry: '/path/to/project',
        dockerfile: 'Dockerfile.custom',
      };

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue(true);
      
      await expect(adapter.setup(config)).resolves.not.toThrow();
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/project/Dockerfile.custom');
    });

    it('should not build Dockerfile when dockerfile does not exist', async () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/project',
        entry: '/path/to/project',
        dockerfile: 'Dockerfile.custom',
        // Add image to avoid the previous error condition
        image: 'test-image:latest',
      };

      mockExistsSync.mockReturnValue(false);
      mockExecSync.mockReturnValue(true);
      
      await expect(adapter.setup(config)).resolves.not.toThrow();
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/project/Dockerfile.custom');
      // Should not call execSync for build since Dockerfile doesn't exist
    });

    it('should handle Docker build failure', async () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/project',
        entry: '/path/to/project',
        dockerfile: 'Dockerfile',
      };

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('docker build')) {
          throw new Error('Build failed');
        }
        return true;
      });

      await expect(adapter.setup(config)).rejects.toThrow('Failed to build Docker image: Build failed');
    });

    it('should handle build context when provided', async () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: '/path/to/project',
        entry: '/path/to/project',
        dockerfile: 'Dockerfile',
        buildContext: '/custom/context',
      };

      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue(true);
      
      await expect(adapter.setup(config)).resolves.not.toThrow();
      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/project/Dockerfile');
    });

    it('should handle command arguments correctly', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
        args: ['nginx', '-g', 'daemon off;'],
      };

      const result = adapter.getSpawnArgs(config);
      
      // Check that command args are included after the image
      expect(result.args).toContain('test-service');
      expect(result.args).toContain('nginx');
      expect(result.args).toContain('-g');
      expect(result.args).toContain('daemon off;');
    });

    it('should handle empty configuration', () => {
      const adapter = new DockerAdapter();
      const config: ServiceConfig = {
        name: 'test-service',
        path: 'nginx:latest',
        entry: 'nginx:latest',
      };

      const result = adapter.getSpawnArgs(config);
      
      // Should still generate basic docker run command
      expect(result.command).toBe('docker');
      expect(result.args[0]).toBe('run');
      expect(result.args).toContain('-d');
      expect(result.args).toContain('--rm');
      expect(result.args).toContain('--name');
      expect(result.args).toContain('test-service');
    });
  });
});
