# Contributing to MCPilot SDK Core

Thank you for your interest in contributing to MCPilot SDK Core! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all contributors. Please be respectful and considerate of others when participating in this project.

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (or yarn/pnpm)
- **Git**: For version control
- **TypeScript**: Version 5.0 or higher

### First Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/sdk-core.git
   cd sdk-core
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/MCPilotX/sdk-core.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

## Development Setup

### Local Development

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Run tests** to ensure your changes don't break existing functionality:
   ```bash
   npm test
   ```

4. **Build the project** to check for TypeScript errors:
   ```bash
   npm run build
   ```

5. **Run linting** to ensure code quality:
   ```bash
   npm run lint
   ```

### Development Workflow

```bash
# 1. Update your fork with latest changes from upstream
git fetch upstream
git checkout main
git merge upstream/main

# 2. Create a new branch for your feature
git checkout -b feature/your-feature-name

# 3. Make your changes and commit
git add .
git commit -m "feat: add your feature description"

# 4. Push to your fork
git push origin feature/your-feature-name

# 5. Create a Pull Request on GitHub
```

## Project Structure

```
sdk-core/
├── src/                    # Source code
│   ├── index.ts           # Main entry point
│   ├── sdk.ts             # Main SDK class
│   ├── ai/                # AI integration
│   ├── core/              # Core functionality
│   ├── mcp/               # MCP protocol implementation
│   └── runtime/           # Runtime adapters
├── examples/              # Example code
├── tests/                 # Test files
├── docs/                  # Documentation
├── scripts/               # Build and utility scripts
└── dist/                  # Compiled output (generated)
```

### Key Directories

- **src/**: All source code lives here
  - `sdk.ts`: Main SDK class with public API
  - `ai/`: AI functionality and integration
  - `mcp/`: MCP protocol implementation
  - `runtime/`: Runtime adapters for different execution environments
  - `core/`: Core utilities and configuration management

- **examples/**: Example usage and demos
  - `zero-config-demo.ts`: Zero-configuration demo for new users
  - `basic-usage.ts`: Basic SDK usage examples
  - `test-*.ts`: Integration and functionality tests

- **tests/**: Unit and integration tests
  - Uses Jest testing framework
  - Test files mirror source structure

## Code Style

### TypeScript Guidelines

1. **Use strict TypeScript**:
   - Enable all strict type checking options
   - Avoid `any` type when possible
   - Use proper type annotations

2. **Naming conventions**:
   - Classes: `PascalCase`
   - Functions/variables: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Interfaces: `PascalCase` (no `I` prefix)

3. **Imports**:
   ```typescript
   // Group imports in this order:
   // 1. External dependencies
   import { MCPClient } from '@modelcontextprotocol/sdk/client';
   
   // 2. Internal modules
   import { ConfigManager } from './core/config-manager';
   
   // 3. Types
   import type { ServiceConfig, RuntimeType } from './core/types';
   ```

4. **Documentation**:
   - Use JSDoc comments for public APIs
   - Include examples for complex functions
   - Document parameters and return types

### Example Code

```typescript
/**
 * Connect to an MCP server
 * @param config - MCP client configuration
 * @param name - Optional server name
 * @returns Connected MCP client instance
 * @throws {Error} If connection fails
 * @example
 * ```typescript
 * const client = await sdk.connectMCPServer({
 *   transport: {
 *     type: 'stdio',
 *     command: 'npx',
 *     args: ['@modelcontextprotocol/server-filesystem']
 *   }
 * }, 'filesystem');
 * ```
 */
async connectMCPServer(config: MCPClientConfig, name?: string): Promise<MCPClient> {
  // Implementation...
}
```

### Error Handling

- Use custom error classes for specific error types
- Provide helpful error messages with suggestions
- Include error codes for programmatic handling

```typescript
export class AIError extends Error {
  constructor(
    public code: string,
    message: string,
    public category: 'config' | 'execution' | 'network',
    public suggestions: string[] = []
  ) {
    super(message);
    this.name = 'AIError';
  }
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/sdk.test.ts

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

1. **Test structure**:
   ```typescript
   describe('MCPilotSDK', () => {
     describe('connectMCPServer', () => {
       it('should connect to MCP server successfully', async () => {
         // Test implementation
       });
       
       it('should throw error for invalid configuration', async () => {
         // Test error case
       });
     });
   });
   ```

2. **Test coverage**:
   - Aim for 80%+ test coverage
   - Test both success and error cases
   - Test edge cases and boundary conditions

3. **Mocking**:
   - Use Jest mocking for external dependencies
   - Mock network requests and file system operations
   - Use dependency injection for testability

### Integration Tests

Integration tests are located in the `examples/` directory and can be run with:

```bash
# Run integration tests
npx tsx examples/test-core-functionality.ts
npx tsx examples/test-mcp-client.ts
npx tsx examples/test-ai-tool-integration.ts
```

## Pull Request Process

### Before Submitting a PR

1. **Ensure your code builds successfully**:
   ```bash
   npm run build
   ```

2. **Run all tests**:
   ```bash
   npm test
   ```

3. **Check code style**:
   ```bash
   npm run lint
   ```

4. **Update documentation** if needed
5. **Add tests** for new functionality
6. **Update examples** if API changes

### PR Checklist

- [ ] Code builds without errors
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Examples are updated (if applicable)
- [ ] Commit messages follow convention

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(mcp): add connectAllFromConfig method for batch connections
fix(ai): improve error messages when AI is not configured
docs(readme): add Why MCPilot? section with code comparison
```

### PR Review Process

1. **Automated checks** will run on your PR
2. **Maintainers will review** your code
3. **Address feedback** by updating your PR
4. **Once approved**, a maintainer will merge your PR

## Issue Reporting

### Creating Issues

When creating an issue, please include:

1. **Clear description** of the problem
2. **Steps to reproduce** the issue
3. **Expected behavior**
4. **Actual behavior**
5. **Environment information** (OS, Node.js version, etc.)
6. **Code examples** if applicable

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or improvement
- `documentation`: Documentation improvements
- `question`: Questions about usage
- `good first issue`: Good for new contributors

## Documentation

### Updating Documentation

1. **README.md**: Main project documentation
2. **API Documentation**: Inline JSDoc comments
3. **Examples**: In `examples/` directory
4. **Architecture Docs**: In `docs/` directory

### Documentation Guidelines

- Keep documentation up-to-date with code changes
- Include code examples for all public APIs
- Use clear, concise language
- Include troubleshooting sections for common issues

## Community

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and discussions
- **Documentation**: Check the README and examples first

### Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes
- Project documentation (if significant contribution)

## License

By contributing to MCPilot SDK Core, you agree that your contributions will be licensed under the project's [Apache License 2.0](LICENSE).

---

Thank you for contributing to MCPilot SDK Core! Your efforts help make this project better for everyone.