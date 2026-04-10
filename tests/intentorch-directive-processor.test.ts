/**
 * IntentorchDirectiveProcessor 测试套件 - 完整版
 * 全面提升测试覆盖度
 */

import { 
  IntentorchDirectiveProcessor, 
  IntentorchDirective,
  DirectiveProcessingResult,
  intentorchDirectiveProcessor 
} from '../src/ai/intentorch-directive-processor';
import { AtomicIntent, DependencyEdge, IntentParseResult } from '../src/ai/cloud-intent-engine';
import { logger } from '../src/core/logger';

// Mock logger
jest.mock('../src/core/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('IntentorchDirectiveProcessor', () => {
  let processor: IntentorchDirectiveProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new IntentorchDirectiveProcessor();
  });

  describe('processQuery() 方法', () => {
    it('应该处理包含@intentorch指令的查询', () => {
      const query = '分析这个文件 @intentorch 并生成总结';
      const result = processor.processQuery(query);

      expect(result.hasDirectives).toBe(true);
      expect(result.directives).toHaveLength(1);
      expect(result.cleanedQuery).toBe('分析这个文件 并生成总结');
      expect(result.directives[0].position).toBe(7);
      expect(result.directives[0].intentId).toBe('AI1');
    });

    it('应该处理多个@intentorch指令', () => {
      const query = '@intentorch 分析这个 @intentorch 然后总结';
      const result = processor.processQuery(query);

      expect(result.hasDirectives).toBe(true);
      expect(result.directives).toHaveLength(2);
      expect(result.cleanedQuery).toBe('分析这个 然后总结');
      
      // 检查指令位置
      // 第一个@intentorch在位置0，第二个在位置17 (0 + 10 + 1 + 4 + 1 + 1)
      // @intentorch(10) + 空格(1) + 分析这个(4) + 空格(1) = 17
      expect(result.directives[0].position).toBe(0);
      expect(result.directives[1].position).toBe(17);
    });

    it('应该处理不包含指令的查询', () => {
      const query = '分析这个文件并生成总结';
      const result = processor.processQuery(query);

      expect(result.hasDirectives).toBe(false);
      expect(result.directives).toHaveLength(0);
      expect(result.cleanedQuery).toBe(query);
    });

    it('应该处理大小写不敏感的@intentorch指令', () => {
      const query = '分析 @INTENTORCH 这个文件';
      const result = processor.processQuery(query);

      expect(result.hasDirectives).toBe(true);
      expect(result.directives).toHaveLength(1);
      expect(result.cleanedQuery).toBe('分析 这个文件');
    });

    it('应该处理混合大小写的指令', () => {
      const query = '@Intentorch 分析 @intentOrch 文件';
      const result = processor.processQuery(query);

      expect(result.hasDirectives).toBe(true);
      expect(result.directives).toHaveLength(2);
      expect(result.cleanedQuery).toBe('分析 文件');
    });

    it('应该正确处理指令周围的空格', () => {
      const query = '分析 @intentorch  文件';
      const result = processor.processQuery(query);

      expect(result.hasDirectives).toBe(true);
      expect(result.cleanedQuery).toBe('分析 文件');
    });

    it('应该处理只有指令的查询', () => {
      const query = '@intentorch';
      const result = processor.processQuery(query);

      expect(result.hasDirectives).toBe(true);
      expect(result.directives).toHaveLength(1);
      expect(result.cleanedQuery).toBe('');
    });

    it('应该记录处理信息', () => {
      const query = '测试 @intentorch 查询';
      processor.processQuery(query);

      expect(logger.info).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('enhanceWorkflowWithDirectives() 方法', () => {
    const baseIntents: AtomicIntent[] = [
      {
        id: '1',
        type: 'get_data',
        description: '获取数据',
        parameters: { path: '/test' }
      },
      {
        id: '2',
        type: 'ai_analysis',
        description: '分析数据',
        parameters: { content: '{{1}}' }
      },
      {
        id: '3',
        type: 'generate_report',
        description: '生成报告',
        parameters: { analysis: '{{2}}' }
      }
    ];

    const baseEdges: DependencyEdge[] = [
      { from: '1', to: '2' },
      { from: '2', to: '3' }
    ];

    const baseResult: IntentParseResult = {
      intents: baseIntents,
      edges: baseEdges
    };

    it('应该在没有指令时返回原始工作流', () => {
      const directives: IntentorchDirective[] = [];
      const result = processor.enhanceWorkflowWithDirectives(baseResult, directives);

      expect(result).toEqual(baseResult);
      expect(result.intents).toHaveLength(3);
    });

    it('应该用@intentorch增强的意图替换AI分析意图', () => {
      const directives: IntentorchDirective[] = [
        { position: 0, intentId: 'AI1' }
      ];

      const result = processor.enhanceWorkflowWithDirectives(baseResult, directives);

      expect(result.intents).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      
      // 检查第二个意图是否被替换
      const enhancedIntent = result.intents[1];
      expect(enhancedIntent.type).toBe('intentorch_ai_summary');
      expect(enhancedIntent.description).toContain('IntentOrch AI');
      expect(enhancedIntent.parameters.enhancedByIntentorch).toBe(true);
      expect(enhancedIntent.parameters.contextIntentId).toBe('1');
    });

    it('应该处理多个指令', () => {
      const directives: IntentorchDirective[] = [
        { position: 0, intentId: 'AI1' },
        { position: 10, intentId: 'AI2' }
      ];

      const result = processor.enhanceWorkflowWithDirectives(baseResult, directives);

      expect(result.intents).toHaveLength(3); // 仍然3个，因为替换了现有的
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Enhancing workflow with 2 @intentorch directives')
      );
    });

    it('应该在找不到AI分析意图时添加新意图', () => {
      // 创建没有AI分析意图的工作流
      const nonAIResult: IntentParseResult = {
        intents: [
          {
            id: '1',
            type: 'get_data',
            description: '获取数据',
            parameters: {}
          },
          {
            id: '2',
            type: 'process_data',
            description: '处理数据',
            parameters: {}
          }
        ],
        edges: [{ from: '1', to: '2' }]
      };

      const directives: IntentorchDirective[] = [
        { position: 0, intentId: 'AI1' }
      ];

      const result = processor.enhanceWorkflowWithDirectives(nonAIResult, directives);

      expect(result.intents).toHaveLength(3); // 添加了新意图
      expect(result.edges).toHaveLength(2); // 添加了新边
      
      const aiIntent = result.intents[2];
      expect(aiIntent.type).toBe('intentorch_ai_summary');
      expect(aiIntent.id).toBe('AI1');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('应该正确更新指令中的intentId', () => {
      const directives: IntentorchDirective[] = [
        { position: 0 }
      ];

      const result = processor.enhanceWorkflowWithDirectives(baseResult, directives);

      expect(directives[0].intentId).toBeDefined();
      expect(directives[0].intentId).toBe('2'); // 替换的意图ID
    });
  });

  describe('buildAISummaryPrompt() 方法', () => {
    it('应该为字符串上下文构建提示', () => {
      const context = '测试内容';
      const prompt = processor.buildAISummaryPrompt(context);

      expect(prompt).toContain('## Content to Analyze');
      expect(prompt).toContain(context);
      expect(prompt).toContain('Markdown-formatted summary report');
    });

    it('应该为对象上下文构建提示', () => {
      const context = { key: 'value', number: 123 };
      const prompt = processor.buildAISummaryPrompt(context);

      expect(prompt).toContain(JSON.stringify(context, null, 2));
    });

    it('应该处理包含[object Object]的字符串', () => {
      const context = '[object Object]';
      const prompt = processor.buildAISummaryPrompt(context);

      expect(prompt).toContain('Content not properly formatted');
      expect(prompt).not.toContain('[object Object]');
    });

    it('应该支持不同的分析类型', () => {
      const context = '测试内容';
      const prompt = processor.buildAISummaryPrompt(context, 'summary');

      expect(prompt).toContain('Please analyze the following content');
    });

    it('应该为未知分析类型使用默认提示', () => {
      const context = '测试内容';
      const prompt = processor.buildAISummaryPrompt(context, 'unknown' as any);

      expect(prompt).toContain('Please analyze the following content');
    });
  });

  describe('formatAIResult() 方法', () => {
    it('应该格式化AI响应为markdown', () => {
      const aiResponse = '# 测试标题\n\n测试内容';
      const result = processor.formatAIResult(aiResponse, 'markdown');

      expect(result.success).toBe(true);
      expect(result.content).toBe(aiResponse);
      expect(result.summary).toBe(aiResponse);
      expect(result.format).toBe('markdown');
      expect(result.markdown).toBe(aiResponse);
      expect(result.metadata.generatedAt).toBeDefined();
      expect(result.metadata.source).toBe('intentorch_ai_summary');
    });

    it('应该格式化AI响应为text', () => {
      const aiResponse = '纯文本响应';
      const result = processor.formatAIResult(aiResponse, 'text');

      expect(result.success).toBe(true);
      expect(result.content).toBe(aiResponse);
      expect(result.format).toBe('text');
      expect(result.markdown).toBeUndefined();
    });

    it('应该格式化AI响应为html', () => {
      const aiResponse = '<h1>HTML响应</h1>';
      const result = processor.formatAIResult(aiResponse, 'html');

      expect(result.success).toBe(true);
      expect(result.content).toBe(aiResponse);
      expect(result.format).toBe('html');
    });
  });

  describe('validateDirectives() 方法', () => {
    it('应该验证有效的指令语法', () => {
      const query = '测试 @intentorch 查询';
      const result = processor.validateDirectives(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该返回空错误数组当没有错误时', () => {
      const query = '正常查询';
      const result = processor.validateDirectives(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('单例实例', () => {
    it('应该导出单例实例', () => {
      expect(intentorchDirectiveProcessor).toBeInstanceOf(IntentorchDirectiveProcessor);
    });

    it('单例实例应该具有所有方法', () => {
      expect(typeof intentorchDirectiveProcessor.processQuery).toBe('function');
      expect(typeof intentorchDirectiveProcessor.enhanceWorkflowWithDirectives).toBe('function');
      expect(typeof intentorchDirectiveProcessor.buildAISummaryPrompt).toBe('function');
      expect(typeof intentorchDirectiveProcessor.formatAIResult).toBe('function');
      expect(typeof intentorchDirectiveProcessor.validateDirectives).toBe('function');
    });

    it('单例实例的方法应该正常工作', () => {
      const query = '测试 @intentorch 查询';
      const result = intentorchDirectiveProcessor.processQuery(query);
      
      expect(result.hasDirectives).toBe(true);
      expect(result.directives).toHaveLength(1);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理空查询', () => {
      const result = processor.processQuery('');
      
      expect(result.hasDirectives).toBe(false);
      expect(result.cleanedQuery).toBe('');
      expect(result.directives).toHaveLength(0);
    });

    it('应该处理只有空格的查询', () => {
      const result = processor.processQuery('   ');
      
      expect(result.hasDirectives).toBe(false);
      expect(result.cleanedQuery).toBe('');
      expect(result.directives).toHaveLength(0);
    });

    it('应该处理非常长的查询', () => {
      const longQuery = '测试'.repeat(1000) + ' @intentorch ' + '内容'.repeat(1000);
      const result = processor.processQuery(longQuery);
      
      expect(result.hasDirectives).toBe(true);
      expect(result.directives).toHaveLength(1);
      expect(result.cleanedQuery).not.toContain('@intentorch');
    });

    it('应该处理特殊字符在指令周围', () => {
      const query = '测试!@#$ @intentorch %^&*()内容';
      const result = processor.processQuery(query);
      
      expect(result.hasDirectives).toBe(true);
      expect(result.cleanedQuery).toBe('测试!@#$ %^&*()内容');
    });

    it('应该处理Unicode字符', () => {
      const query = '测试🎉 @intentorch 中文📚内容';
      const result = processor.processQuery(query);
      
      expect(result.hasDirectives).toBe(true);
      expect(result.cleanedQuery).toBe('测试🎉 中文📚内容');
    });

    it('应该处理嵌套对象作为上下文', () => {
      const context = {
        data: {
          nested: {
            deep: 'value',
            array: [1, 2, 3]
          }
        }
      };
      const prompt = processor.buildAISummaryPrompt(context);
      
      expect(prompt).toContain('"deep": "value"');
      // JSON.stringify 使用多行格式，所以检查数组元素
      expect(prompt).toContain('"array": [');
      expect(prompt).toContain('1');
      expect(prompt).toContain('2');
      expect(prompt).toContain('3');
    });

    it('应该处理null和undefined上下文', () => {
      const nullPrompt = processor.buildAISummaryPrompt(null as any);
      const undefinedPrompt = processor.buildAISummaryPrompt(undefined as any);
      
      expect(nullPrompt).toBeDefined();
      expect(undefinedPrompt).toBeDefined();
    });

    it('应该处理空工作流增强', () => {
      const emptyResult: IntentParseResult = {
        intents: [],
        edges: []
      };
      const directives: IntentorchDirective[] = [{ position: 0 }];
      
      const result = processor.enhanceWorkflowWithDirectives(emptyResult, directives);
      
      expect(result.intents).toHaveLength(1); // 添加了新意图
      expect(result.edges).toHaveLength(0); // 没有边可以添加
    });

    it('应该处理重复的指令位置', () => {
      const query = '@intentorch @intentorch 测试';
      const result = processor.processQuery(query);
      
      expect(result.directives).toHaveLength(2);
      expect(result.cleanedQuery).toBe('测试');
    });
  });
});