import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AIChatPanel from '../components/orchestration/AIChatPanel';
import StepPreviewBoard from '../components/orchestration/StepPreviewBoard';
import { Toast } from '../components/ui';
import { aiService } from '../services/ai';
import { apiService } from '../services/api';
import { workflowEngine } from '../services/workflowEngine';
import { formatMCPServerName } from '../utils/format';
import { useOutputFormatting } from '../hooks/useOutputFormatting';
import type { WorkflowStep, Workflow } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

const Orchestration: React.FC = () => {
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [draftSteps, setDraftSteps] = useState<WorkflowStep[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'capability_missing' | 'error'>('idle');
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  const [actionSelection, setActionSelection] = useState<'execute' | 'save' | 'edit'>('execute');
  const [autoExecute, setAutoExecute] = useState(true);
  const [hasUserChangedAction, setHasUserChangedAction] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Output formatting hook
  const { formatExecutionResult: formatWithNewSystem } = useOutputFormatting({
    debug: process.env.NODE_ENV === 'development',
    autoInitialize: true,
    defaultOptions: {
      detailLevel: 'standard',
      language: 'en'
    }
  });

  // Mutation to save the generated workflow
  const saveWorkflowMutation = useMutation({
    mutationFn: (workflowData: any) => apiService.saveWorkflow(workflowData),
    onSuccess: (savedWorkflow: Workflow) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      showToast(`Workflow "${savedWorkflow.name}" saved successfully!`, 'success');
      return savedWorkflow;
    },
    onError: (error) => {
      console.error('Failed to save workflow:', error);
      showToast(`Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    },
  });

  // Mutation to execute workflow with enhanced engine
  const executeWorkflowMutation = useMutation({
    mutationFn: (workflowId: string) => workflowEngine.executeWorkflowWithValidation(workflowId),
    onSuccess: (result) => {
      console.log('✅ Workflow execution result:', result);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      if (result.success) {
        setExecutionStatus('success');
        showToast('Workflow executed successfully!', 'success');
        
        // Add execution result to chat messages
        console.log('📊 Execution result data:', result.executionResult);
        if (result.executionResult) {
          const formattedResult = formatExecutionResult(result.executionResult);
          console.log('📝 Formatted execution result:', formattedResult);
          
          const executionMessage: Message = {
            id: `execution-${Date.now()}`,
            role: 'assistant',
            content: formattedResult,
            timestamp: new Date().toISOString()
          };
          console.log('💬 Adding execution message to chat:', executionMessage);
          setMessages(prev => [...prev, executionMessage]);
        } else {
          console.warn('⚠️ No executionResult in result:', result);
        }
      } else {
        setExecutionStatus('error');
        showToast(`Workflow execution failed: ${result.message || 'Unknown error'}`, 'error');
      }
    },
    onError: (error) => {
      console.error('Workflow execution error:', error);
      setExecutionStatus('error');
      showToast(`Workflow execution error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    },
  });

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Start analysis
    setIsAnalyzing(true);
    setStatus('idle');
    
    try {
      const result = await aiService.parseIntent(content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.status === 'success' 
          ? `I've generated a workflow with ${result.steps.length} steps for you. Review the steps on the right and choose an action.`
          : "I'm sorry, I couldn't find the necessary tools to satisfy your request. I've highlighted the missing capabilities.",
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setDraftSteps(result.steps);
      setStatus(result.status);
      
      // Smart auto-execute logic
      // Only auto-execute if:
      // 1. User hasn't manually changed the action (first time or default)
      // 2. Auto-execute is enabled (true by default for "execute")
      // 3. Steps were successfully generated
      // 4. The selected action is "execute"
      const shouldAutoExecute = 
        !hasUserChangedAction && 
        autoExecute && 
        result.status === 'success' && 
        result.steps.length > 0 &&
        actionSelection === 'execute';
      
      if (shouldAutoExecute) {
        console.log('🔄 Auto-executing workflow...');
        setTimeout(() => {
          handleAction(actionSelection);
        }, 800); // Slightly longer delay to let user see the steps
      } else if (result.status === 'success' && result.steps.length > 0) {
        // Show a toast message if steps were generated but not auto-executed
        if (actionSelection !== 'execute') {
          showToast(`Workflow generated with ${result.steps.length} steps. Select "${actionSelection}" action to proceed.`, 'info');
        } else if (hasUserChangedAction) {
          showToast(`Workflow generated. Click "Execute Now" to run it.`, 'info');
        }
      }
    } catch (error) {
      console.error('Failed to parse intent:', error);
      setStatus('error');
      
      // Provide more helpful error messages based on error type
      let errorContent = "I encountered an error while trying to process your request. ";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          errorContent += "It seems there's a network issue. Please check your connection and try again.";
        } else if (errorMsg.includes('auth') || errorMsg.includes('401') || errorMsg.includes('token')) {
          errorContent += "Authentication issue detected. The system will try to use fallback mode.";
          
          // Try fallback parsing
          try {
            const fallbackResult = await aiService.parseIntent(content);
            if (fallbackResult.status === 'success' && fallbackResult.steps.length > 0) {
              errorContent = "Using fallback mode: I've generated a workflow for you. Review the steps on the right.";
              setDraftSteps(fallbackResult.steps);
              setStatus(fallbackResult.status);
            }
          } catch (fallbackError) {
            console.warn('Fallback also failed:', fallbackError);
          }
        } else if (errorMsg.includes('server') || errorMsg.includes('mcp') || errorMsg.includes('missing')) {
          errorContent += "Required MCP server may not be available. Please ensure the necessary servers are installed and running.";
        } else {
          errorContent += "Please try again or rephrase your request.";
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle the selected action
  const handleAction = (action: 'execute' | 'save' | 'edit') => {
    if (draftSteps.length === 0) return;
    
    const workflowName = messages.find(m => m.role === 'user')?.content.substring(0, 30) || 'AI Generated Workflow';
    const workflowData = {
      id: '',
      name: workflowName,
      description: `Generated from intent: ${messages.find(m => m.role === 'user')?.content}`,
      steps: draftSteps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    switch (action) {
      case 'execute':
        // Save and execute
        saveWorkflowMutation.mutate(workflowData, {
          onSuccess: (savedWorkflow) => {
            setExecutionStatus('executing');
            const workflowId = savedWorkflow.id;
            console.log('Saved workflow object:', savedWorkflow);
            console.log(`Executing workflow with ID: ${workflowId}`);
            if (!workflowId) {
              console.error('Workflow ID is empty! Saved workflow:', savedWorkflow);
              showToast('Failed to save workflow: No workflow ID returned', 'error');
              setExecutionStatus('error');
              return;
            }
            executeWorkflowMutation.mutate(workflowId);
          }
        });
        break;
        
      case 'save':
        // Save only
        saveWorkflowMutation.mutate(workflowData);
        break;
        
      case 'edit':
        // Just keep the steps for editing, no action needed
        showToast('Workflow steps ready for editing', 'info');
        break;
    }
  };

  // Handle action selection change
  const handleActionChange = (action: 'execute' | 'save' | 'edit') => {
    setActionSelection(action);
    setHasUserChangedAction(true);
    
    // Update auto-execute preference based on selection
    if (action === 'execute') {
      setAutoExecute(true);
    } else {
      setAutoExecute(false);
    }
  };

  const handleClear = () => {
    setDraftSteps([]);
    setStatus('idle');
  };

  const handleDeleteStep = (id: string) => {
    setDraftSteps(prev => prev.filter(step => step.id !== id));
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Format execution result for display in chat
  const formatExecutionResult = (executionResult: any): string => {
    if (!executionResult) return 'Workflow execution completed.';
    
    // Extract user query from messages
    const userQuery = messages.find(m => m.role === 'user')?.content;
    
    // Use the new output formatting system
    try {
      return formatWithNewSystem(executionResult, userQuery);
    } catch (error) {
      console.error('Failed to format execution result with new system:', error);
      
      // Fallback to simple formatting
      const { workflowName, name, totalSteps, successfulSteps, failedSteps, results } = executionResult;
      const displayName = workflowName || name || 'Workflow';
      
      let formatted = `**${displayName} Execution Complete**\n\n`;
      
      if (totalSteps !== undefined) {
        formatted += `Steps: ${successfulSteps || 0}/${totalSteps} successful`;
        if (failedSteps) {
          formatted += `, ${failedSteps} failed`;
        }
        formatted += '\n\n';
      }
      
      if (results && Array.isArray(results)) {
        formatted += `**Step Results:**\n\n`;
        
        results.forEach((result: any, index: number) => {
          const stepName = result.toolName || result.stepId || `Step ${index + 1}`;
          const serverName = formatMCPServerName(result.serverName || 'Unknown Server');
          const status = result.status || 'unknown';
          
          formatted += `${index + 1}. **${stepName}** (${serverName}) - ${status}\n`;
          
          if (result.message) {
            formatted += `   ${result.message}\n`;
          }
        });
      }
      
      return formatted;
    }
  };

  // Format step results in a generic, extensible way
  const formatStepResults = (results: any[], showOutputForSuccessOnly: boolean = true): string => {
    let formatted = `📋 **Step Results:**\n\n`;
    
    results.forEach((result: any, index: number) => {
      const stepName = result.toolName || result.stepId || `Step ${index + 1}`;
      const serverName = formatMCPServerName(result.serverName || 'Unknown Server');
      const status = result.status || 'unknown';
      
      formatted += `${index + 1}. **${stepName}** (${serverName})\n`;
      formatted += `   ${getStatusEmoji(status)} ${formatStatusText(status)}\n`;
      
      if (result.message) {
        formatted += `   💡 ${result.message}\n`;
      }
      
      // Show output for successful steps or all steps based on parameter
      if (result.output && (!showOutputForSuccessOnly || status === 'success')) {
        formatted += formatStepOutput(result.output);
      }
      
      if (result.timestamp) {
        const time = new Date(result.timestamp).toLocaleTimeString();
        formatted += `   ⏰ ${time}\n`;
      }
      
      formatted += '\n';
    });
    
    return formatted;
  };

  // Get emoji for step status
  const getStatusEmoji = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'skipped':
        return '⏭️';
      case 'running':
        return '🔄';
      default:
        return '❓';
    }
  };

  // Format status text
  const formatStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'skipped':
        return 'Skipped';
      case 'running':
        return 'Running';
      default:
        return 'Unknown';
    }
  };

  // Format step output in a generic and extensible way
  const formatStepOutput = (output: any): string => {
    let formatted = '';
    
    if (typeof output === 'string') {
      // Try to detect and format specific types of output
      const formattedResult = detectAndFormatOutput(output);
      if (formattedResult) {
        formatted += formattedResult;
      } else {
        // Generic text formatting
        formatted += formatGenericTextOutput(output);
      }
    } else if (typeof output === 'object' && output !== null) {
      // Special handling for ticket data
      if (isTicketData(output)) {
        return formatTicketData(output);
      }
      // Try to format object as readable text
      formatted += formatObjectOutput(output);
    } else if (output !== null && output !== undefined) {
      formatted += `   📝 ${String(output)}\n`;
    }
    
    return formatted;
  };
  
  // Check if data is ticket data
  const isTicketData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // Check for common ticket data patterns
    const hasTickets = Array.isArray(data.tickets) || Array.isArray(data.data);
    const hasTrainInfo = data.tickets?.some((ticket: any) => 
      ticket.trainNo || ticket.trainNumber || ticket.from || ticket.to
    );
    
    return hasTickets || hasTrainInfo;
  };
  
  // Format ticket data in a user-friendly way
  const formatTicketData = (data: any): string => {
    let formatted = '';
    
    // Extract tickets array
    const tickets = data.tickets || data.data || [];
    
    if (tickets.length === 0) {
      formatted += `   🎫 **车票查询结果**\n`;
      formatted += `   • 未找到符合条件的车票\n`;
      return formatted;
    }
    
    formatted += `   🎫 **车票查询结果** (共 ${tickets.length} 个车次)\n\n`;
    
    // Format each ticket
    tickets.forEach((ticket: any, index: number) => {
      const trainNo = ticket.trainNo || ticket.trainNumber || ticket.train_code || '未知车次';
      const from = ticket.from || ticket.departure_station || '未知出发站';
      const to = ticket.to || ticket.arrival_station || '未知到达站';
      const departureTime = ticket.departureTime || ticket.start_time || '未知时间';
      const arrivalTime = ticket.arrivalTime || ticket.end_time || '未知时间';
      const duration = ticket.duration || ticket.run_time || '未知时长';
      const seats = ticket.seats || ticket.seat_info || {};
      
      formatted += `   ${index + 1}. **${trainNo}** ${from} → ${to}\n`;
      formatted += `      🕐 ${departureTime} - ${arrivalTime} (${duration})\n`;
      
      // Format seat availability
      if (Object.keys(seats).length > 0) {
        formatted += `      💺 余票: `;
        const seatTypes = [];
        for (const [seatType, availability] of Object.entries(seats)) {
          if (availability && availability !== '无' && availability !== '0') {
            seatTypes.push(`${seatType}: ${availability}`);
          }
        }
        if (seatTypes.length > 0) {
          formatted += seatTypes.join(', ');
        } else {
          formatted += '暂无余票';
        }
        formatted += '\n';
      }
      
      // Add price if available
      if (ticket.price) {
        formatted += `      💰 票价: ${ticket.price}元\n`;
      }
      
      formatted += '\n';
    });
    
    return formatted;
  };

  // Detect and format specific types of output
  const detectAndFormatOutput = (output: string): string | null => {
    // Check for table-like data (通用表格检测)
    if (output.includes('|') && output.split('\n').length > 3) {
      const lines = output.split('\n');
      const hasTableHeader = lines[0].includes('|');
      const hasTableRows = lines.slice(1).some(line => line.includes('|') && line.trim().length > 0);
      
      if (hasTableHeader && hasTableRows) {
        return formatTableOutput(output);
      }
    }
    
    // Check for JSON-like output
    if ((output.trim().startsWith('{') && output.trim().endsWith('}')) ||
        (output.trim().startsWith('[') && output.trim().endsWith(']'))) {
      try {
        const parsed = JSON.parse(output);
        return formatObjectOutput(parsed);
      } catch {
        // Not valid JSON, continue with other detection
      }
    }
    
    // Check for error messages
    if (output.toLowerCase().includes('error') || 
        output.toLowerCase().includes('failed') ||
        output.toLowerCase().includes('exception')) {
      return formatErrorOutput(output);
    }
    
    // Check for success/confirmation messages
    if (output.toLowerCase().includes('success') || 
        output.toLowerCase().includes('completed') ||
        output.toLowerCase().includes('created')) {
      return formatSuccessOutput(output);
    }
    
    return null;
  };

  // Format generic text output
  const formatGenericTextOutput = (output: string): string => {
    let formatted = '';
    const maxLength = 300;
    
    if (output.length > maxLength) {
      formatted += `   📝 ${output.substring(0, maxLength)}...\n`;
      formatted += `   📊 **内容摘要:** ${extractSummary(output)}\n`;
    } else {
      formatted += `   📝 ${output}\n`;
    }
    
    return formatted;
  };

  // Format object output - generic object formatting
  const formatObjectOutput = (obj: any): string => {
    let formatted = '';
    
    try {
      // Generic pattern: Extract string content from common properties
      const stringProperties = ['result', 'output', 'data', 'content', 'message', 'text'];
      let stringContent = '';
      
      for (const prop of stringProperties) {
        if (obj[prop] && typeof obj[prop] === 'string') {
          stringContent = obj[prop];
          break;
        }
      }
      
      // If we found string content, try to format it
      if (stringContent) {
        // Check if it's table-like data
        if (stringContent.includes('|') && stringContent.split('\n').length > 3) {
          const lines = stringContent.split('\n');
          const hasTableHeader = lines[0].includes('|');
          const hasTableRows = lines.slice(1).some(line => line.includes('|') && line.trim().length > 0);
          
          if (hasTableHeader && hasTableRows) {
            return formatTableOutput(stringContent);
          }
        }
        
        // Check if it's JSON-like
        if ((stringContent.trim().startsWith('{') && stringContent.trim().endsWith('}')) ||
            (stringContent.trim().startsWith('[') && stringContent.trim().endsWith(']'))) {
          try {
            const parsed = JSON.parse(stringContent);
            return formatObjectOutput(parsed);
          } catch {
            // Not valid JSON, continue
          }
        }
        
        // Otherwise, show as generic text
        return formatGenericTextOutput(stringContent);
      }
      
      // Pattern 3: Regular object - use JSON renderer
      const jsonStr = JSON.stringify(obj, null, 2);
      if (jsonStr.length > 500) {
        // For large objects, show a summary with JSON renderer marker
        formatted += `   📊 **结构化数据** (${Object.keys(obj).length} 个属性)\n`;
        formatted += `   • 类型: ${Array.isArray(obj) ? `数组 (${obj.length} 项)` : '对象'}\n`;
        
        // Show first few keys/items
        if (Array.isArray(obj)) {
          const sampleItems = obj.slice(0, 3);
          formatted += `   • 示例项: ${sampleItems.map(item => 
            typeof item === 'object' ? '{...}' : String(item)
          ).join(', ')}${obj.length > 3 ? '...' : ''}\n`;
        } else {
          const sampleKeys = Object.keys(obj).slice(0, 5);
          formatted += `   • 主要属性: ${sampleKeys.join(', ')}${Object.keys(obj).length > 5 ? '...' : ''}\n`;
        }
        
        // Add JSON renderer marker
        formatted += `   • **完整数据:**\n`;
        formatted += `   <!-- JSON_RENDERER_START:${btoa(JSON.stringify(obj))} -->\n`;
        formatted += `   <!-- JSON_RENDERER_END -->\n`;
      } else {
        // For small objects, use JSON renderer directly
        formatted += `   📊 **结构化数据**\n`;
        formatted += `   <!-- JSON_RENDERER_START:${btoa(JSON.stringify(obj))} -->\n`;
        formatted += `   <!-- JSON_RENDERER_END -->\n`;
      }
    } catch {
      formatted += `   📊 [结构化数据]\n`;
    }
    
    return formatted;
  };


  // Format table output
  const formatTableOutput = (output: string): string => {
    let formatted = '';
    const lines = output.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return '';
    
    // Extract header
    const header = lines[0];
    const rows = lines.slice(1);
    
    // Count rows and columns
    const columnCount = (header.match(/\|/g) || []).length + 1;
    const rowCount = rows.length;
    
    formatted += `   📊 **表格数据** (${rowCount} 行 × ${columnCount} 列)\n`;
    
    // Show header
    formatted += `   **表头:** ${header}\n`;
    
    // Show first few rows as examples
    const exampleRows = rows.slice(0, 3);
    if (exampleRows.length > 0) {
      formatted += `   **示例行:**\n`;
      exampleRows.forEach((row, index) => {
        formatted += `   ${index + 1}. ${row}\n`;
      });
    }
    
    if (rowCount > 3) {
      formatted += `   ... 还有 ${rowCount - 3} 行未显示\n`;
    }
    
    return formatted;
  };

  // Format error output
  const formatErrorOutput = (output: string): string => {
    let formatted = '';
    
    formatted += `   ❌ **执行遇到问题**\n`;
    
    // Extract error message
    const errorMatch = output.match(/error[:\s]+([^\n]+)/i) || 
                      output.match(/failed[:\s]+([^\n]+)/i) ||
                      output.match(/exception[:\s]+([^\n]+)/i);
    
    if (errorMatch && errorMatch[1]) {
      formatted += `   • 问题: ${errorMatch[1].trim()}\n`;
    } else {
      // Show first line as summary
      const firstLine = output.split('\n')[0].trim();
      if (firstLine) {
        formatted += `   • 问题: ${firstLine}\n`;
      }
    }
    
    // Add troubleshooting tips
    formatted += `\n   🔧 **建议:**\n`;
    formatted += `   • 检查输入参数是否正确\n`;
    formatted += `   • 确认相关服务是否正常运行\n`;
    formatted += `   • 查看详细日志获取更多信息\n`;
    
    return formatted;
  };

  // Format success output
  const formatSuccessOutput = (output: string): string => {
    let formatted = '';
    
    formatted += `   ✅ **操作成功**\n`;
    
    // Extract success message
    const successMatch = output.match(/success[:\s]+([^\n]+)/i) || 
                        output.match(/completed[:\s]+([^\n]+)/i) ||
                        output.match(/created[:\s]+([^\n]+)/i);
    
    if (successMatch && successMatch[1]) {
      formatted += `   • 结果: ${successMatch[1].trim()}\n`;
    } else {
      // Show first line as summary
      const firstLine = output.split('\n')[0].trim();
      if (firstLine) {
        formatted += `   • 结果: ${firstLine}\n`;
      }
    }
    
    return formatted;
  };

  // Extract summary from long text
  const extractSummary = (text: string): string => {
    // Remove excessive whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Take first 100 characters as summary
    if (cleanText.length <= 100) {
      return cleanText;
    }
    
    // Try to find a sentence boundary
    const sentenceEnd = cleanText.substring(0, 150).search(/[.!?。！？]\s/);
    if (sentenceEnd > 50) {
      return cleanText.substring(0, sentenceEnd + 1) + '...';
    }
    
    // Fallback to first 100 characters
    return cleanText.substring(0, 100) + '...';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] -m-6 overflow-hidden">
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Left Side: Chat */}
        <div className="w-1/3 min-w-[350px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
          <AIChatPanel 
            onSendMessage={handleSendMessage} 
            messages={messages} 
            isAnalyzing={isAnalyzing} 
          />
        </div>
        
        {/* Right Side: Preview */}
        <div className="flex-1 min-w-0">
          <StepPreviewBoard 
            steps={draftSteps} 
            status={status}
            onClear={handleClear}
            onDeleteStep={handleDeleteStep}
            actionSelection={actionSelection}
            onActionChange={handleActionChange}
            onActionExecute={() => handleAction(actionSelection)}
            isExecuting={executionStatus === 'executing'}
          />
        </div>
      </div>

      {/* Execution Status Overlay - Only show for executing, not for success/error */}
      {executionStatus === 'executing' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Executing Workflow</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait, workflow is being executed...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </div>
  );
};

export default Orchestration;
