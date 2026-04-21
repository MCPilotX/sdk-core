# 意图驱动编排 (Intelligent Orchestration) 设计规范

## 1. 背景与目标 (Background & Objectives)
当前项目的工作流编排功能过于底层，用户需要手动选择 MCP Server 和工具并配置复杂的参数。本功能旨在实现“意图驱动编排”，让用户通过自然语言描述其自动化需求，由 AI 自动解析意图、匹配工具并生成结构化的工作流。

### 核心目标：
- **极简交互**：用户只需描述“做什么”，无需关心“怎么做”。
- **生态联动**：深度集成本地 MCP Server 和 `mcp-server-hub`。
- **意图补偿**：当能力不足时，引导用户参与生态建设或联系官方。

## 2. 视觉与交互设计 (UI/UX Design)
采用“对话侧边栏 + 中心预览看板”的混合布局。

### 2.1 布局组件：
- **左侧 (AIChatPanel)**：
    - 沉浸式聊天窗口，支持流式文本输入。
    - 状态指示器：显示 AI 正在“解析意图”、“搜索工具”或“生成步骤”。
- **右侧 (StepPreviewBoard)**：
    - 垂直时间轴/卡片流，展示生成的 `WorkflowStep` 草稿。
    - **StepCard**：展示动作类型、参数摘要及依赖关系。
    - **操作栏**：底部包含“一键发布”、“重新生成”和“清空草稿”。

### 2.2 核心交互流：
1. 用户输入意图（如：“帮我把 GitHub 的 Star 项目同步到 Notion”）。
2. AI 解析并搜索本地及云端工具。
3. 若工具匹配：右侧实时渲染步骤卡片 -> 用户确认 -> 点击发布。
4. 若工具缺失：展示“能力缺失强提醒卡片”，引导用户至 `mcp-server-hub` 提交 PR 或联系官方。

## 3. 架构设计 (Technical Architecture)

### 3.1 数据结构
复用项目现有的 `Workflow` 和 `WorkflowStep` 定义：
```typescript
interface WorkflowStep {
  id: string;
  type: 'server' | 'tool' | 'condition' | 'loop';
  serverId?: string;
  toolName?: string;
  parameters?: Record<string, any>;
  nextSteps?: string[];
}
```

### 3.2 状态管理 (React State)
- `chatMessages`: 维护对话历史。
- `draftSteps`: 存储 AI 生成但尚未持久化的步骤列表。
- `isAnalyzing`: 控制解析状态的 UI 反馈。

### 3.3 AI 解析机制 (AI Reasoning)
- **System Prompt 策略**：
    - 注入当前已安装的 `MCPServer[]` 列表。
    - 注入 `mcp-server-hub` 的搜索能力说明。
    - 要求输出严格的 JSON 格式步骤。
- **意图补偿逻辑**：
    1. 检查本地安装。
    2. 调用 `apiService.searchServices` 检索 Hub。
    3. 若均失败，返回特定的 `status: capability_missing` 信号。

## 4. 关键接口与服务 (Services)
- **`apiService.saveWorkflow`**: 用于最终发布生成的流程。
- **`apiService.searchServices`**: 用于云端工具检索。
- **`aiService.parseIntent`**: (新增) 封装大模型接口调用逻辑。

## 5. 错误处理与补偿机制 (Error Handling)
- **强提醒机制**：当 AI 返回无法满足意图时，渲染包含官方 GitHub 链接和 PR 引导的特殊卡片。
- **参数验证**：在发布前对 AI 生成的参数进行 JSON Schema 验证（如果可用）。

## 6. 后续扩展性
- 支持“对话式微调”：用户可以针对某个生成的步骤说“把数据库连接改成测试库”。
- 支持图形化画布切换：为高级用户提供从列表预览切换到可视化连线图的能力。
