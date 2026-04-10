import { describe, it, expect } from '@jest/globals';
import { PROVIDER_DB } from '../src/core/providers';
describe('Providers', () => {
    describe('PROVIDER_DB', () => {
        it('should contain all AI providers', () => {
            const providers = ['openai', 'anthropic', 'google', 'azure', 'deepseek', 'ollama', 'none'];
            providers.forEach(provider => {
                expect(PROVIDER_DB[provider]).toBeDefined();
                expect(PROVIDER_DB[provider].name).toBeDefined();
                expect(PROVIDER_DB[provider].description).toBeDefined();
                expect(PROVIDER_DB[provider].aliases).toBeDefined();
                expect(Array.isArray(PROVIDER_DB[provider].aliases)).toBe(true);
                expect(typeof PROVIDER_DB[provider].requiresApiKey).toBe('boolean');
                expect(PROVIDER_DB[provider].defaultModel).toBeDefined();
            });
        });
        it('should have correct OpenAI provider info', () => {
            const openai = PROVIDER_DB.openai;
            expect(openai.name).toBe('OpenAI');
            expect(openai.description).toContain('OpenAI GPT');
            expect(openai.aliases).toContain('gpt');
            expect(openai.aliases).toContain('chatgpt');
            expect(openai.requiresApiKey).toBe(true);
            expect(openai.defaultModel).toBe('gpt-4');
            expect(openai.modelDescriptions).toBeDefined();
            expect(openai.modelDescriptions['gpt-4']).toBe('Latest GPT-4, most capable');
            expect(openai.configHint).toContain('API key format');
        });
        it('should have correct Anthropic provider info', () => {
            const anthropic = PROVIDER_DB.anthropic;
            expect(anthropic.name).toBe('Anthropic');
            expect(anthropic.description).toContain('Anthropic Claude');
            expect(anthropic.aliases).toContain('claude');
            expect(anthropic.requiresApiKey).toBe(true);
            expect(anthropic.defaultModel).toContain('claude-3');
            expect(anthropic.modelDescriptions).toBeDefined();
            expect(anthropic.configHint).toContain('API key format');
        });
        it('should have correct Google provider info', () => {
            const google = PROVIDER_DB.google;
            expect(google.name).toBe('Google');
            expect(google.description).toContain('Google Gemini');
            expect(google.aliases).toContain('gemini');
            expect(google.aliases).toContain('bard');
            expect(google.requiresApiKey).toBe(true);
            expect(google.defaultModel).toBe('gemini-pro');
            expect(google.modelDescriptions).toBeDefined();
        });
        it('should have correct Azure provider info', () => {
            const azure = PROVIDER_DB.azure;
            expect(azure.name).toBe('Azure');
            expect(azure.description).toContain('Azure OpenAI');
            expect(azure.aliases).toContain('azure-openai');
            expect(azure.requiresApiKey).toBe(true);
            expect(azure.defaultModel).toBe('gpt-35-turbo');
            expect(azure.modelDescriptions).toBeDefined();
            expect(azure.configHint).toContain('Azure OpenAI endpoint');
        });
        it('should have correct DeepSeek provider info', () => {
            const deepseek = PROVIDER_DB.deepseek;
            expect(deepseek.name).toBe('DeepSeek');
            expect(deepseek.description).toContain('DeepSeek');
            expect(deepseek.aliases).toContain('deep-seek');
            expect(deepseek.requiresApiKey).toBe(true);
            expect(deepseek.defaultModel).toBe('deepseek-chat');
            expect(deepseek.modelDescriptions).toBeDefined();
        });
        it('should have correct Ollama provider info', () => {
            const ollama = PROVIDER_DB.ollama;
            expect(ollama.name).toBe('Ollama');
            expect(ollama.description).toContain('Ollama');
            expect(ollama.aliases).toContain('local-llm');
            expect(ollama.requiresApiKey).toBe(false);
            expect(ollama.defaultModel).toBe('llama2');
            expect(ollama.modelDescriptions).toBeDefined();
            expect(ollama.configHint).toContain('localhost');
        });
        it('should have correct "none" provider info', () => {
            const none = PROVIDER_DB.none;
            expect(none.name).toBe('None');
            expect(none.description).toContain('No AI');
            expect(none.aliases).toContain('disabled');
            expect(none.requiresApiKey).toBe(false);
            expect(none.defaultModel).toBe('none');
            expect(none.modelDescriptions).toBeUndefined();
        });
        it('should have unique aliases across providers', () => {
            const allAliases = [];
            const duplicateAliases = [];
            Object.values(PROVIDER_DB).forEach(provider => {
                provider.aliases.forEach(alias => {
                    const lowerAlias = alias.toLowerCase();
                    if (allAliases.includes(lowerAlias)) {
                        duplicateAliases.push(lowerAlias);
                    }
                    else {
                        allAliases.push(lowerAlias);
                    }
                });
            });
            expect(duplicateAliases).toEqual([]);
        });
    });
    describe('ProviderInfo interface', () => {
        it('should have correct structure', () => {
            const providerInfo = {
                name: 'Test Provider',
                description: 'Test description',
                aliases: ['test', 'test-alias'],
                requiresApiKey: true,
                defaultModel: 'test-model',
                modelDescriptions: {
                    'test-model': 'Test model description',
                },
                configHint: 'Test config hint',
            };
            expect(providerInfo.name).toBe('Test Provider');
            expect(providerInfo.description).toBe('Test description');
            expect(providerInfo.aliases).toEqual(['test', 'test-alias']);
            expect(providerInfo.requiresApiKey).toBe(true);
            expect(providerInfo.defaultModel).toBe('test-model');
            expect(providerInfo.modelDescriptions).toEqual({
                'test-model': 'Test model description',
            });
            expect(providerInfo.configHint).toBe('Test config hint');
        });
        it('should allow optional modelDescriptions and configHint', () => {
            const providerInfo = {
                name: 'Test Provider',
                description: 'Test description',
                aliases: ['test'],
                requiresApiKey: false,
                defaultModel: 'test-model',
            };
            expect(providerInfo.modelDescriptions).toBeUndefined();
            expect(providerInfo.configHint).toBeUndefined();
        });
    });
});
//# sourceMappingURL=providers.test.js.map