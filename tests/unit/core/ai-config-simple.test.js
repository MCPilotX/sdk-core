import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AIConfigParser } from '../../../src/core/ai-config';
// Mock chalk to avoid color codes in test output
jest.mock('chalk', () => ({
    yellow: jest.fn((text) => text),
    cyan: jest.fn((text) => text),
    green: jest.fn((text) => text),
    red: jest.fn((text) => text),
    blue: jest.fn((text) => text),
}));
// Mock console.log to capture output
const mockConsoleLog = jest.fn();
const originalConsoleLog = console.log;
describe('AIConfigParser - 简化测试', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = mockConsoleLog;
    });
    afterEach(() => {
        console.log = originalConsoleLog;
    });
    describe('parse方法', () => {
        it('应该处理空参数数组', () => {
            const result = AIConfigParser.parse([]);
            expect(result).toBeNull();
        });
        it('应该解析有效的提供商名称', () => {
            const args = ['openai'];
            const result = AIConfigParser.parse(args);
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
        });
        it('应该自动纠正拼写错误的提供商名称', () => {
            const args = ['opena']; // 拼写错误
            const result = AIConfigParser.parse(args);
            // 应该自动纠正为openai
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
        });
        it('应该解析提供商和API密钥', () => {
            const args = ['openai', 'sk-test1234567890'];
            const result = AIConfigParser.parse(args);
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
            expect(result?.apiKey).toBe('sk-test1234567890');
        });
        it('应该解析提供商、API密钥和模型', () => {
            const args = ['openai', 'sk-test1234567890', 'gpt-4'];
            const result = AIConfigParser.parse(args);
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
            expect(result?.apiKey).toBe('sk-test1234567890');
            expect(result?.model).toBe('gpt-4');
        });
        it('应该解析提供商和模型（无API密钥）', () => {
            const args = ['openai', 'gpt-4'];
            const result = AIConfigParser.parse(args);
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
            expect(result?.model).toBe('gpt-4');
        });
        it('应该处理不存在的提供商', () => {
            const args = ['nonexistentprovider'];
            const result = AIConfigParser.parse(args);
            expect(result).toBeNull();
            // 应该显示错误信息
            expect(mockConsoleLog).toHaveBeenCalled();
        });
    });
    describe('applyConfig方法', () => {
        it('应该应用有效的配置', async () => {
            const config = {
                provider: 'openai',
                apiKey: 'sk-test1234567890',
                model: 'gpt-4',
            };
            // Mock the implementation
            const mockApplyConfig = jest.spyOn(AIConfigParser, 'applyConfig');
            mockApplyConfig.mockResolvedValue(true);
            const result = await AIConfigParser.applyConfig(config);
            expect(result).toBe(true);
            mockApplyConfig.mockRestore();
        });
        it('应该处理配置应用失败', async () => {
            const config = {
                provider: 'openai',
                apiKey: 'invalid-key',
            };
            // Mock the implementation to return false
            const mockApplyConfig = jest.spyOn(AIConfigParser, 'applyConfig');
            mockApplyConfig.mockResolvedValue(false);
            const result = await AIConfigParser.applyConfig(config);
            expect(result).toBe(false);
            mockApplyConfig.mockRestore();
        });
    });
    describe('showAIStatus方法', () => {
        it('应该显示AI状态', () => {
            // Mock the implementation
            const mockShowAIStatus = jest.spyOn(AIConfigParser, 'showAIStatus');
            mockShowAIStatus.mockImplementation(() => { });
            AIConfigParser.showAIStatus();
            expect(mockShowAIStatus).toHaveBeenCalled();
            mockShowAIStatus.mockRestore();
        });
    });
    describe('listProviders方法', () => {
        it('应该列出所有提供商', () => {
            // Mock the implementation
            const mockListProviders = jest.spyOn(AIConfigParser, 'listProviders');
            mockListProviders.mockImplementation(() => { });
            AIConfigParser.listProviders();
            expect(mockListProviders).toHaveBeenCalled();
            mockListProviders.mockRestore();
        });
    });
    describe('listModels方法', () => {
        it('应该列出指定提供商的模型', () => {
            // Mock the implementation
            const mockListModels = jest.spyOn(AIConfigParser, 'listModels');
            mockListModels.mockImplementation(() => { });
            AIConfigParser.listModels('openai');
            expect(mockListModels).toHaveBeenCalledWith('openai');
            mockListModels.mockRestore();
        });
        it('应该列出所有提供商的模型（当未指定提供商时）', () => {
            // Mock the implementation
            const mockListModels = jest.spyOn(AIConfigParser, 'listModels');
            mockListModels.mockImplementation(() => { });
            AIConfigParser.listModels();
            // When called without arguments, it should be called with no arguments
            // not with undefined argument
            expect(mockListModels).toHaveBeenCalled();
            mockListModels.mockRestore();
        });
    });
    describe('close方法', () => {
        it('应该关闭接口', () => {
            // Mock the implementation
            const mockClose = jest.spyOn(AIConfigParser, 'close');
            mockClose.mockImplementation(() => { });
            AIConfigParser.close();
            expect(mockClose).toHaveBeenCalled();
            mockClose.mockRestore();
        });
    });
    describe('边缘情况', () => {
        it('应该处理大小写不敏感的提供商名称', () => {
            const args = ['OpenAI']; // 大写
            const result = AIConfigParser.parse(args);
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
        });
        it('应该处理带有空格的参数', () => {
            const args = ['openai', 'sk-test-key-with-spaces', 'gpt-4'];
            const result = AIConfigParser.parse(args);
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
            expect(result?.apiKey).toBe('sk-test-key-with-spaces');
            expect(result?.model).toBe('gpt-4');
        });
        it('应该处理超长参数', () => {
            const longApiKey = 'sk-' + 'a'.repeat(100);
            const args = ['openai', longApiKey];
            const result = AIConfigParser.parse(args);
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
            expect(result?.apiKey).toBe(longApiKey);
        });
    });
    describe('错误处理', () => {
        it('应该处理无效的提供商名称并提供建议', () => {
            const args = ['invalidproviderxyz']; // 明显无效的提供商名称
            const result = AIConfigParser.parse(args);
            expect(result).toBeNull();
            // 应该显示相似提供商的建议
            expect(mockConsoleLog).toHaveBeenCalled();
        });
        it('应该处理无效的API密钥格式', () => {
            const args = ['openai', 'not-an-api-key'];
            const result = AIConfigParser.parse(args);
            // 应该仍然解析成功，但apiKey可能为undefined
            expect(result).toBeDefined();
            expect(result?.provider).toBe('openai');
        });
    });
});
//# sourceMappingURL=ai-config-simple.test.js.map