import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter,
  PlayCircle,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Clock,
  Layers,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Calendar,
  Download,
  Upload
} from 'lucide-react';
import { apiService } from '../services/api';
import { formatRelativeTime } from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';
import type { Workflow } from '../types';

const Workflows: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
  });

  // Get workflow list
  const { data: workflows = [], isLoading, refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiService.getWorkflows(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: () => apiService.saveWorkflow({
      id: '',
      name: newWorkflow.name,
      description: newWorkflow.description,
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowCreateModal(false);
      setNewWorkflow({ name: '', description: '' });
    },
  });

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  // Execute workflow mutation
  const executeWorkflowMutation = useMutation({
    mutationFn: (id: string) => apiService.executeWorkflow({ workflowId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  // Filter workflows
  const filteredWorkflows = workflows.filter(workflow => {
    // Safe handling: ensure name and description exist
    const name = workflow.name || '';
    const description = workflow.description || '';
    const searchTermLower = searchTerm.toLowerCase();
    
    const matchesSearch = name.toLowerCase().includes(searchTermLower) ||
                         description.toLowerCase().includes(searchTermLower);
    return matchesSearch;
  });

  // Statistics
  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.lastExecutedAt).length,
    neverExecuted: workflows.filter(w => !w.lastExecutedAt).length,
    hasSteps: workflows.filter(w => w.steps.length > 0).length,
  };

  // Handle create workflow
  const handleCreateWorkflow = () => {
    if (!newWorkflow.name.trim()) {
      alert('Please enter workflow name');
      return;
    }
    createWorkflowMutation.mutate();
  };

  // Handle delete workflow
  const handleDeleteWorkflow = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete workflow "${name}"?`)) {
      deleteWorkflowMutation.mutate(id);
    }
  };

  // Handle execute workflow
  const handleExecuteWorkflow = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to execute workflow "${name}"?`)) {
      executeWorkflowMutation.mutate(id);
    }
  };

  // Handle edit workflow
  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('workflows.title')}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('workflows.description')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('workflows.createWorkflow')}</span>
        </button>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('workflows.totalWorkflows')}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('workflows.executedWorkflows')}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('workflows.neverExecutedWorkflows')}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.neverExecuted}</p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('workflows.workflowsWithSteps')}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.hasSteps}</p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflow name or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All workflows</option>
                <option value="hasSteps">With steps defined</option>
                <option value="executed">Executed before</option>
                <option value="neverExecuted">Never executed</option>
              </select>
            </div>
            
            <div className="flex space-x-2">
              <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={() => refetch()}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.length > 0 ? (
          filteredWorkflows.map((workflow) => (
            <div key={workflow.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{workflow.name}</h3>
                    <p className="text-sm text-gray-500">{workflow.id}</p>
                  </div>
                </div>
                <div className="relative">
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                {workflow.description || 'No description'}
              </p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <GitBranch className="w-4 h-4 mr-2" />
                    <span>Steps</span>
                  </div>
                  <span className="font-medium">{workflow.steps.length}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Created</span>
                  </div>
                  <span>{formatRelativeTime(workflow.createdAt)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Last executed</span>
                  </div>
                  <span>
                    {workflow.lastExecutedAt ? formatRelativeTime(workflow.lastExecutedAt) : 'Never executed'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExecuteWorkflow(workflow.id, workflow.name)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Execute</span>
                  </button>
                  <button
                    onClick={() => handleEditWorkflow(workflow)}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {/* Copy function */}}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3">
            <div className="card text-center py-12">
              <Layers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('workflows.noWorkflows')}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm ? 'No matching workflows found' : 'No workflows created yet'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create first workflow</span>
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Create workflow modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create Workflow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create a new automation workflow</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Data Preprocessing Pipeline"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe the purpose and functionality of this workflow"
                  rows={3}
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({...newWorkflow, description: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700 space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                disabled={createWorkflowMutation.isPending}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit workflow modal */}
      {showEditModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Edit Workflow: {selectedWorkflow.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Workflow ID: {selectedWorkflow.id}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="text-center py-12">
                <Edit className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Workflow Editor</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Workflow editor functionality is under development, visual orchestration interface coming soon
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500">
                Last updated: {formatRelativeTime(selectedWorkflow.updatedAt)}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
