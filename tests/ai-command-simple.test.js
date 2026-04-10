/**
 * AI Command Simple Tests
 * Simple tests for src/ai/ai-command.ts to improve test coverage
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AICommand } from '../src/ai/ai-command';
// Mock chalk
jest.mock('chalk', () => ({
    green: (text) => `green(${text})`,
    yellow: (text) => `yellow(${text})`,
    red: (text) => `red(${text})`,
    blue: (text) => `blue(${text})`,
    cyan: (text) => `cyan(${text})`,
    magenta: (text) => `magenta(${text})`,
    gray: (text) => `gray(${text})`,
}));
// Mock AI and AIConfigManager
jest.mock('../src/ai/ai', () => {
    return {
        AI: class MockAI {
            mockConfigured = false;
            mockProvider = 'none';
            async configure(config) {
                this.mockConfigured = true;
                this.mockProvider = config.provider || 'none';
            }
            reset() {
                this.mockConfigured = false;
                this.mockProvider = 'none';
            }
            getStatus() {
                return {
                    enabled: this.mockConfigured,
                    provider: this.mockProvider,
                    configured: this.mockConfigured,
                };
            }
            async testConnection() {
                if (!this.mockConfigured) {
                    return { success: false, message: 'AI not configured' };
                }
                return { success: true, message: 'Connection test successful (mocked)' };
            }
            async ask(query) {
                if (!this.mockConfigured) {
                    throw new Error('AI provider not configured');
                }
                if (query.includes('list files')) {
                    return {
                        type: 'tool_call',
                        tool: {
                            name: 'filesystem.list_files',
                            arguments: { path: '.' },
                        },
                        confidence: 0.9,
                    };
                }
                return {
                    type: 'suggestions',
                    message: 'Mocked response',
                    suggestions: ['Mocked suggestion'],
                };
            }
            getFriendlyError(error) {
                return `Friendly error: ${error.message}`;
            }
        },
        AIError: class MockAIError extends Error {
            constructor(code, message, category, suggestions) {
                super(message);
                this.name = 'AIError';
            }
        },
    };
});
jest.mock('../src/ai/config', () => {
    return {
        AIConfigManager: class MockAIConfigManager {
            mockConfig = { provider: 'none' };
            getConfig() {
                return this.mockConfig;
            }
            parseFromArgs(args) {
                const config = { provider: 'none' };
                for (const arg of args) {
                    if (arg === 'openai') {
                        config.provider = 'openai';
                    }
                    else if (arg === 'ollama') {
                        config.provider = 'ollama';
                    }
                    else if (arg.startsWith('--api-key=')) {
                        config.apiKey = arg.split('=')[1];
                    }
                    else if (arg.startsWith('--model=')) {
                        config.model = arg.split('=')[1];
                    }
                    else if (arg.startsWith('--endpoint=')) {
                        config.endpoint = arg.split('=')[1];
                    }
                }
                return config;
            }
            async updateConfig(config) {
                this.mockConfig = { ...this.mockConfig, ...config };
            }
            resetConfig() {
                this.mockConfig = { provider: 'none' };
            }
            getStatus() {
                return {
                    configured: this.mockConfig.provider !== 'none',
                    configFile: '/mock/config/path.json',
                };
            }
            formatConfig() {
                const config = this.mockConfig;
                return `Provider: ${config.provider}\nAPI Key: ${config.apiKey || 'Not set'}`;
            }
        },
    };
});
describe('AICommand Simple Tests', () => {
    let aiCommand;
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;
    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        aiCommand = new AICommand();
    });
    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.restoreAllMocks();
    });
    describe('constructor', () => {
        it('should create an instance', () => {
            expect(aiCommand).toBeInstanceOf(AICommand);
        });
    });
    describe('handleCommand', () => {
        it('should show status when no action provided', async () => {
            await aiCommand.handleCommand();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🤖 AI Status:'));
        });
        it('should handle configure command', async () => {
            await aiCommand.handleCommand('configure', 'openai', '--api-key=test-key');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ AI configured with provider: openai'));
        });
        it('should handle test command when configured', async () => {
            // First configure
            await aiCommand.handleCommand('configure', 'openai', '--api-key=test-key');
            consoleLogSpy.mockClear();
            // Then test
            await aiCommand.handleCommand('test');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🔌 Testing AI connection...'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Connection test successful'));
        });
        it('should handle generateText command with valid query', async () => {
            // First configure
            await aiCommand.handleCommand('configure', 'openai', '--api-key=test-key');
            consoleLogSpy.mockClear();
            // Then ask
            await aiCommand.handleCommand('ask', 'list files in current directory');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🤖 Query: "list files in current directory"'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Intent recognized'));
        });
        it('should handle status command', async () => {
            await aiCommand.handleCommand('status');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🤖 AI Status:'));
        });
        it('should handle reset command', async () => {
            await aiCommand.handleCommand('reset');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ AI configuration reset to defaults'));
        });
        it('should handle help command', async () => {
            await aiCommand.handleCommand('help');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🤖 AI Commands:'));
        });
    });
});
//# sourceMappingURL=ai-command-simple.test.js.map