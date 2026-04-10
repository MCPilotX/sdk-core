/**
 * IntentorchAITool 测试套件
 * 全面提升测试覆盖度
 */

import { IntentorchAITool, IntentorchAIToolConfig, getIntentorchAITool } from '../src/ai/intentorch-ai-tool';
import { logger } from '../src/core/logger';

// Mock AI 服务
const mockAI = {
  generateText: jest.fn()
};

// Mock logger
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('IntentorchAITool', () => {
  let tool: IntentorchAITool;
  let config: IntentorchAIToolConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      ai: mockAI as any,
      defaultTemperature: 0.3,
      defaultMaxTokens: 2048
    };
    tool = new IntentorchAITool(config);
  });

  describe('构造函数', () => {
    it('应该使用提供的配置正确初始化', () => {
      expect(tool).toBeInstanceOf(IntentorchAITool);
    });

    it('应该使用默认值当配置未提供时', () => {
      const toolWithDefaults = new IntentorchAITool({ ai: mockAI as any });
      // 可以通过执行方法来验证默认值
      expect(toolWithDefaults).toBeInstanceOf(IntentorchAITool);
    });

    it('应该正确处理自定义配置', () => {
      const customConfig = {
        ai: mockAI as any,
        defaultTemperature: 0.7,
        defaultMaxTokens: 4096
      };
      const customTool = new IntentorchAITool(customConfig);
      expect(customTool).toBeInstanceOf(IntentorchAITool);
    });
  });

  describe('execute() 方法', () => {
    const mockContext = '测试上下文内容';
    const mockAIResponse = '# AI生成的Markdown总结\n\n这是测试内容。';

    beforeEach(() => {
      mockAI.generateText.mockResolvedValue(mockAIResponse);
    });

    it('应该成功执行并返回正确格式的结果', async () => {
      const result = await tool.execute(mockContext);

      expect(result.success).toBe(true);
      expect(result.content).toBe(mockAIResponse);
      expect(result.format).toBe('markdown');
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.processingTime).toBeDefined();
      expect(mockAI.generateText).toHaveBeenCalled();
    });

    it('应该支持不同的输出格式', async () => {
      const result = await tool.execute(mockContext, { format: 'html' });

      expect(result.success).toBe(true);
      expect(result.format).toBe('html');
    });

    it('应该支持不同的分析类型', async () => {
      const result = await tool.execute(mockContext, { analysisType: 'review' });

      expect(result.success).toBe(true);
      expect(mockAI.generateText).toHaveBeenCalled();
    });

    it('应该使用自定义温度和token限制', async () => {
      const customOptions = {
        temperature: 0.8,
        maxTokens: 1024
      };

      await tool.execute(mockContext, customOptions);

      expect(mockAI.generateText).toHaveBeenCalledWith(
        expect.any(String),
        {
          temperature: customOptions.temperature,
          maxTokens: customOptions.maxTokens
        }
      );
    });

    it('应该使用默认配置当选项未提供时', async () => {
      await tool.execute(mockContext);

      expect(mockAI.generateText).toHaveBeenCalledWith(
        expect.any(String),
        {
          temperature: config.defaultTemperature,
          maxTokens: config.defaultMaxTokens
        }
      );
    });

    it('应该处理对象类型的上下文', async () => {
      const objectContext = { key: 'value', nested: { data: 'test' } };
      
      await tool.execute(objectContext);
      
      expect(mockAI.generateText).toHaveBeenCalled();
    });

    it('应该处理AI服务失败的情况', async () => {
      const errorMessage = 'AI服务错误';
      mockAI.generateText.mockRejectedValue(new Error(errorMessage));

      const result = await tool.execute(mockContext);

      expect(result.success).toBe(false);
      expect(result.content).toContain(errorMessage);
      expect(result.format).toBe('markdown');
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该记录执行信息', async () => {
      await tool.execute(mockContext);

      expect(logger.info).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('validateContext() 方法', () => {
    it('应该验证有效的字符串上下文', () => {
      const result = tool.validateContext('有效的上下文');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该验证有效的对象上下文', () => {
      const result = tool.validateContext({ key: 'value' });
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝undefined上下文', () => {
      const result = tool.validateContext(undefined as any);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Context is undefined or null');
    });

    it('应该拒绝null上下文', () => {
      const result = tool.validateContext(null);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Context is undefined or null');
    });

    it('应该拒绝空字符串上下文', () => {
      const result = tool.validateContext('');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Context string is empty');
    });

    it('应该拒绝只有空格的字符串上下文', () => {
      const result = tool.validateContext('   ');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Context string is empty');
    });

    it('应该拒绝空对象上下文', () => {
      const result = tool.validateContext({});
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Context object is empty');
    });
  });

  describe('formatResult() 方法', () => {
    const successResult = {
      success: true,
      content: '# 测试内容',
      format: 'markdown' as const,
      metadata: {
        generatedAt: '2024-01-01T00:00:00.000Z',
        processingTime: 100
      }
    };

    const errorResult = {
      success: false,
      content: '错误信息',
      format: 'markdown' as const,
      metadata: {
        generatedAt: '2024-01-01T00:00:00.000Z'
      }
    };

    it('应该格式化成功结果', () => {
      const formatted = tool.formatResult(successResult);

      expect(formatted.success).toBe(true);
      expect(formatted.content).toBe(successResult.content);
      expect(formatted.summary).toBe(successResult.content);
      expect(formatted.format).toBe(successResult.format);
      expect(formatted.metadata).toEqual(successResult.metadata);
      expect(formatted.markdown).toBe(successResult.content);
      expect(formatted.workflowResult.type).toBe('ai_summary');
      expect(formatted.workflowResult.source).toBe('intentorch_ai_tool');
    });

    it('应该格式化非markdown格式的成功结果', () => {
      const textResult = { ...successResult, format: 'text' as const };
      const formatted = tool.formatResult(textResult);

      expect(formatted.success).toBe(true);
      expect(formatted.format).toBe('text');
      expect(formatted.markdown).toBeUndefined();
    });

    it('应该格式化错误结果', () => {
      const formatted = tool.formatResult(errorResult);

      expect(formatted.success).toBe(false);
      expect(formatted.error).toBe(errorResult.content);
      expect(formatted.metadata).toEqual(errorResult.metadata);
      expect(formatted.workflowResult.type).toBe('error');
      expect(formatted.workflowResult.error).toBe(errorResult.content);
      expect(formatted.workflowResult.source).toBe('intentorch_ai_tool');
    });
  });

  describe('buildPrompt() 私有方法', () => {
    // 由于buildPrompt是私有方法，我们需要通过execute方法来测试
    it('应该为summary类型构建正确的提示', async () => {
      const context = '测试内容';
      await tool.execute(context, { analysisType: 'summary' });

      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain('Please analyze the following content');
      expect(prompt).toContain('## Content to Analyze');
      expect(prompt).toContain(context);
      expect(prompt).toContain('Markdown-formatted summary report');
    });

    it('应该为review类型构建正确的提示', async () => {
      const context = '测试内容';
      await tool.execute(context, { analysisType: 'review' });

      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain('Please review the following content');
      expect(prompt).toContain('## Content to Review');
      expect(prompt).toContain('critical analysis');
    });

    it('应该为analysis类型构建正确的提示', async () => {
      const context = '测试内容';
      await tool.execute(context, { analysisType: 'analysis' });

      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain('Please perform a detailed analysis');
      expect(prompt).toContain('## Content for Analysis');
      expect(prompt).toContain('detailed analysis');
    });

    it('应该为未知类型使用默认summary提示', async () => {
      const context = '测试内容';
      await tool.execute(context, { analysisType: 'unknown' as any });

      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain('Please analyze the following content');
      expect(prompt).toContain('summary');
    });

    it('应该正确处理对象上下文', async () => {
      const context = { key: 'value', number: 123 };
      await tool.execute(context);

      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain(JSON.stringify(context, null, 2));
    });
  });

  describe('单例工厂函数', () => {
    it('应该返回相同的实例', () => {
      const instance1 = getIntentorchAITool(mockAI as any);
      const instance2 = getIntentorchAITool(mockAI as any);

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(IntentorchAITool);
    });

    it('应该使用提供的AI实例', () => {
      const instance = getIntentorchAITool(mockAI as any);
      expect(instance).toBeInstanceOf(IntentorchAITool);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理非常长的上下文', async () => {
      const longContext = 'a'.repeat(10000);
      await tool.execute(longContext);

      expect(mockAI.generateText).toHaveBeenCalled();
      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain(longContext.substring(0, 100));
    });

    it('应该处理特殊字符的上下文', async () => {
      const specialContext = '特殊字符: !@#$%^&*()_+{}|:"<>?~`';
      await tool.execute(specialContext);

      expect(mockAI.generateText).toHaveBeenCalled();
      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain(specialContext);
    });

    it('应该处理嵌套对象上下文', async () => {
      const nestedContext = {
        level1: {
          level2: {
            level3: {
              data: 'deeply nested'
            }
          }
        }
      };
      await tool.execute(nestedContext);

      expect(mockAI.generateText).toHaveBeenCalled();
      const prompt = mockAI.generateText.mock.calls[0][0];
      expect(prompt).toContain('deeply nested');
    });

    it('应该处理数组上下文', async () => {
      const arrayContext = ['item1', 'item2', 'item3'];
      await tool.execute(arrayContext);

      expect(mockAI.generateText).toHaveBeenCalled();
    });

    it('应该处理数字上下文', async () => {
      const numberContext = 12345;
      await tool.execute(numberContext as any);

      expect(mockAI.generateText).toHaveBeenCalled();
    });

    it('应该处理布尔值上下文', async () => {
      const booleanContext = true;
      await tool.execute(booleanContext as any);

      expect(mockAI.generateText).toHaveBeenCalled();
    });
  });
});