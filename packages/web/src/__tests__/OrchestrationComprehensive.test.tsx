import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Orchestration from '../pages/Orchestration';
import { aiService } from '../services/ai';
import { apiService } from '../services/api';
import { LanguageProvider } from '../contexts/LanguageContext';

// Mock services
vi.mock('../services/ai', () => ({
  aiService: {
    parseIntent: vi.fn(),
  },
}));

vi.mock('../services/api', () => ({
  apiService: {
    saveWorkflow: vi.fn(),
    searchServices: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderOrchestration = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <Orchestration />
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

describe('意图编排页面全面场景测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.saveWorkflow as any).mockResolvedValue({ id: 'new-wf-123' });
    (apiService.searchServices as any).mockResolvedValue({ total: 0, services: [] });
  });

  describe('场景1: 完整工作流生成与发布', () => {
    it('用户输入意图 -> AI解析成功 -> 生成步骤 -> 发布工作流', async () => {
      // 模拟AI解析成功
      (aiService.parseIntent as any).mockResolvedValue({
        status: 'success',
        steps: [
          { 
            id: 'step_1', 
            type: 'tool', 
            serverName: 'github', 
            toolName: 'list_stars', 
            parameters: { owner: 'MCPilotX' } 
          },
          { 
            id: 'step_2', 
            type: 'tool', 
            serverName: 'notion', 
            toolName: 'create_page', 
            parameters: { parent_id: 'auto_detected', title: 'GitHub Stars' } 
          }
        ]
      });

      renderOrchestration();

      // 1. 用户输入意图
      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      fireEvent.change(input, { target: { value: 'Sync GitHub stars to Notion' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 2. 验证分析状态
      expect(screen.getByText(/Analyzing intent|正在解析意图/i)).toBeInTheDocument();

      // 3. 验证步骤生成
      await waitFor(() => {
        expect(screen.getByText('github')).toBeInTheDocument();
        expect(screen.getByText('list_stars')).toBeInTheDocument();
        expect(screen.getByText('notion')).toBeInTheDocument();
        expect(screen.getByText('create_page')).toBeInTheDocument();
      });

      // 4. 验证步骤数量显示
      expect(screen.getByText(/2 steps generated/i)).toBeInTheDocument();

      // 5. 发布工作流 - 使用更精确的选择器
      const publishButton = screen.getByRole('button', { name: /Publish|发布/i });
      fireEvent.click(publishButton);

      // 6. 验证API调用
      await waitFor(() => {
        expect(apiService.saveWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Sync GitHub stars to Notion',
            steps: expect.arrayContaining([
              expect.objectContaining({ serverName: 'github' }),
              expect.objectContaining({ serverName: 'notion' })
            ])
          })
        );
      });
    });
  });

  describe('场景2: 能力缺失处理', () => {
    it('用户输入未知意图 -> AI返回能力缺失 -> 显示能力缺失页面', async () => {
      // 模拟能力缺失
      (aiService.parseIntent as any).mockResolvedValue({
        status: 'capability_missing',
        steps: []
      });

      renderOrchestration();

      // 输入未知意图
      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      fireEvent.change(input, { target: { value: 'Unknown intent that cannot be satisfied' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 验证能力缺失页面显示
      await waitFor(() => {
        expect(screen.getByText(/Capability Not Found|未找到匹配能力/i)).toBeInTheDocument();
        expect(screen.getByText(/Submit Tool Request|提交工具请求/i)).toBeInTheDocument();
      });

      // 验证没有步骤生成（但可能有"0 steps generated"文本）
      // 所以我们需要检查是否有实际的步骤卡片
      expect(screen.queryByText('github')).not.toBeInTheDocument();
      expect(screen.queryByText('list_stars')).not.toBeInTheDocument();
    });
  });

  describe('场景3: 错误处理', () => {
    it('AI服务异常 -> 显示错误信息 -> 用户可以重试', async () => {
      // 模拟AI服务异常
      (aiService.parseIntent as any).mockRejectedValue(new Error('AI service unavailable'));

      renderOrchestration();

      // 输入意图
      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      fireEvent.change(input, { target: { value: 'Test intent' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 验证错误信息显示
      await waitFor(() => {
        expect(screen.getByText(/Failed to generate workflow|生成工作流失败/i)).toBeInTheDocument();
      });

      // 验证用户可以重新输入
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('场景4: 步骤管理', () => {
    it('生成步骤后 -> 清空所有步骤', async () => {
      // 模拟生成多个步骤
      (aiService.parseIntent as any).mockResolvedValue({
        status: 'success',
        steps: [
          { id: 'step_1', type: 'tool', serverName: 'github', toolName: 'list_stars' },
          { id: 'step_2', type: 'tool', serverName: 'slack', toolName: 'post_message' },
          { id: 'step_3', type: 'tool', serverName: 'notion', toolName: 'create_page' }
        ]
      });

      renderOrchestration();

      // 生成步骤
      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      fireEvent.change(input, { target: { value: 'Multi-step workflow' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/3 steps generated/i)).toBeInTheDocument();
      });

      // 清空所有步骤 - 通过title属性查找
      const clearButtons = screen.getAllByRole('button');
      const clearButton = clearButtons.find(button => 
        button.getAttribute('title')?.includes('Clear all steps') ||
        button.getAttribute('title')?.includes('清空所有步骤')
      );
      
      if (clearButton) {
        fireEvent.click(clearButton);
      }

      // 验证所有步骤被清除
      await waitFor(() => {
        expect(screen.queryByText('github')).not.toBeInTheDocument();
        expect(screen.queryByText('slack')).not.toBeInTheDocument();
        expect(screen.queryByText('notion')).not.toBeInTheDocument();
      });
    });
  });

  describe('场景5: 边界条件测试', () => {
    it('空输入 -> 发送按钮禁用', () => {
      renderOrchestration();

      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      const sendButton = screen.getByRole('button', { name: '' }); // 发送按钮

      // 初始状态应为禁用
      expect(sendButton).toBeDisabled();

      // 输入空格后仍应禁用
      fireEvent.change(input, { target: { value: '   ' } });
      expect(sendButton).toBeDisabled();

      // 输入有效内容后启用
      fireEvent.change(input, { target: { value: 'Valid intent' } });
      expect(sendButton).not.toBeDisabled();
    });

    it('分析过程中 -> 发送按钮禁用', async () => {
      // 模拟长时间分析
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      (aiService.parseIntent as any).mockImplementation(() => promise);

      renderOrchestration();

      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      const sendButton = screen.getByRole('button', { name: '' });

      // 开始分析
      fireEvent.change(input, { target: { value: 'Test intent' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 验证分析过程中发送按钮禁用
      expect(sendButton).toBeDisabled();

      // 完成分析
      await act(async () => {
        resolvePromise!({
          status: 'success',
          steps: [{ id: 'step_1', type: 'tool', serverName: 'test', toolName: 'test_tool' }]
        });
        // 等待微任务队列清空
        await Promise.resolve();
      });

      // 验证分析完成后，如果输入框有内容，按钮应该启用
      // 首先模拟用户输入新内容
      fireEvent.change(input, { target: { value: 'New intent' } });
      
      // 验证按钮启用
      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });

    it('无步骤时 -> 发布按钮禁用', () => {
      renderOrchestration();

      // 使用更可靠的选择器：通过按钮文本和角色
      const publishButton = screen.getByRole('button', { name: /Publish|发布/i });
      
      // 验证发布按钮禁用
      expect(publishButton).toBeDisabled();
    });
  });

  describe('场景6: 多语言支持', () => {
    it('界面文本支持多语言', () => {
      renderOrchestration();

      // 验证关键元素存在（英文或中文）
      expect(screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i)).toBeInTheDocument();
      expect(screen.getByText(/AI Assistant|AI助手/i)).toBeInTheDocument();
      
      // 使用getAllByText处理多个匹配项
      const workflowTexts = screen.getAllByText(/Generate automation workflows|使用自然语言生成自动化工作流/i);
      expect(workflowTexts.length).toBeGreaterThan(0);
    });
  });

  describe('场景7: 性能与并发测试', () => {
    it('快速连续输入 -> 正确处理请求队列', async () => {
      const resolves: Array<(value: any) => void> = [];

      // 模拟异步AI解析
      (aiService.parseIntent as any).mockImplementation(() => {
        return new Promise(resolve => {
          resolves.push(resolve);
        });
      });

      renderOrchestration();

      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      const sendButton = screen.getByRole('button', { name: '' });

      // 快速发送请求
      fireEvent.change(input, { target: { value: 'First intent' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 等待第一个请求开始处理
      await waitFor(() => {
        expect(screen.getByText(/Analyzing intent|正在解析意图/i)).toBeInTheDocument();
      });

      // 在第一个请求完成前，发送按钮应该被禁用
      expect(sendButton).toBeDisabled();

      // 解析第一个请求
      await act(async () => {
        resolves[0]({
          status: 'success',
          steps: [{ id: 'step_1', type: 'tool', serverName: 'test', toolName: 'test_tool' }]
        });
        // 等待微任务队列清空
        await Promise.resolve();
      });

      // 验证可以继续输入 - 模拟用户输入新内容
      fireEvent.change(input, { target: { value: 'Second intent' } });
      
      // 验证按钮启用
      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });
  });

  describe('场景8: 网络异常处理', () => {
    it('API调用失败 -> 优雅降级', async () => {
      // 模拟API调用失败
      (apiService.saveWorkflow as any).mockRejectedValue(new Error('Network error'));

      // 模拟AI解析成功
      (aiService.parseIntent as any).mockResolvedValue({
        status: 'success',
        steps: [
          { id: 'step_1', type: 'tool', serverName: 'github', toolName: 'list_stars' }
        ]
      });

      renderOrchestration();

      // 生成步骤
      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      fireEvent.change(input, { target: { value: 'Test workflow' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('github')).toBeInTheDocument();
      });

      // 尝试发布（应该失败但不会崩溃）
      const publishButton = screen.getByRole('button', { name: /Publish|发布/i });
      fireEvent.click(publishButton);

      // 验证应用没有崩溃，仍然可以操作
      await waitFor(() => {
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('场景9: UI/UX测试', () => {
    it('聊天界面显示用户和AI消息', async () => {
      // 模拟AI解析成功
      (aiService.parseIntent as any).mockResolvedValue({
        status: 'success',
        steps: [{ id: 'step_1', type: 'tool', serverName: 'test', toolName: 'test_tool' }]
      });

      renderOrchestration();

      // 发送消息
      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 验证用户消息显示
      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeInTheDocument();
      });

      // 验证AI回复显示
      await waitFor(() => {
        expect(screen.getByText(/I've generated a workflow|我已为您生成工作流/i)).toBeInTheDocument();
      });
    });

    it('步骤卡片显示正确信息', async () => {
      // 模拟生成步骤
      (aiService.parseIntent as any).mockResolvedValue({
        status: 'success',
        steps: [
          { 
            id: 'step_1', 
            type: 'tool', 
            serverName: 'github', 
            toolName: 'list_stars',
            parameters: { owner: 'MCPilotX', limit: 10 }
          }
        ]
      });

      renderOrchestration();

      // 生成步骤
      const input = screen.getByPlaceholderText(/Type your intent|输入您的自动化需求/i);
      fireEvent.change(input, { target: { value: 'Show GitHub stars' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 验证步骤卡片显示
      await waitFor(() => {
        expect(screen.getByText('github')).toBeInTheDocument();
        expect(screen.getByText('list_stars')).toBeInTheDocument();
        expect(screen.getByText(/Step 1/i)).toBeInTheDocument();
        expect(screen.getByText(/TOOL/i)).toBeInTheDocument();
      });
    });
  });
});