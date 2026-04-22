import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Toast } from '../components/ui';
import type { Config, UpdateConfigRequest } from '../types';

// AI Providers and their models
const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-instruct'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2.1'] },
  { id: 'google', name: 'Google', models: ['gemini-pro', 'gemini-ultra', 'palm-2'] },
  { id: 'azure', name: 'Azure OpenAI', models: ['gpt-4', 'gpt-35-turbo', 'davinci'] },
  { id: 'cohere', name: 'Cohere', models: ['command', 'command-light', 'command-r', 'command-r-plus'] },
  { id: 'huggingface', name: 'Hugging Face', models: ['llama-2-70b', 'mistral-7b', 'zephyr-7b'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'custom', name: 'Custom', models: [] },
];

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export default function ConfigPage() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateConfigRequest>({
    config: {
      ai: { provider: '', apiKey: '', model: '' },
      registry: { default: '', fallback: '' }
    }
  });
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success'
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConfig();
      setConfig(data);
      
      // Check if API key is hidden (masked with dots or asterisks)
      const isApiKeyHidden = data.ai?.apiKey?.includes('•') || 
                            data.ai?.apiKey?.includes('*') || 
                            (data.ai?.apiKey && data.ai.apiKey.length < 10);
      
      setFormData({
        config: {
          ai: { 
            provider: data.ai?.provider || '',
            model: data.ai?.model || '',
            // Don't set hidden API key in form data
            apiKey: isApiKeyHidden ? '' : (data.ai?.apiKey || '')
          },
          registry: { ...data.registry }
        }
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || t('config.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updatedConfig = await apiService.updateConfig(formData);
      setConfig(updatedConfig);
      setError(null);
      showToast(t('config.saveConfiguration') + ' ' + t('common.save') + '!', 'success');
    } catch (err: any) {
      setError(err.message || t('config.error.saveFailed'));
      showToast(err.message || t('config.error.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConfig = async () => {
    const { provider, model, apiKey } = formData.config.ai || {};
    
    if (!provider || !model) {
      showToast(t('config.testErrorMissingFields'), 'error');
      return;
    }
    
    // Check if API key is empty or too short
    if (!apiKey || apiKey.trim().length === 0) {
      showToast('Please enter your API key to test the configuration.', 'error');
      return;
    }
    
    // Check if API key looks like a masked/hidden key
    // Masked keys typically consist only of bullet points (•) or asterisks (*)
    const maskedPattern = /^[•*]+$/;
    if (maskedPattern.test(apiKey)) {
      showToast('Please enter your actual API key (not the masked version) to test the configuration.', 'error');
      return;
    }
    
    // Check if API key is too short to be a real API key
    if (apiKey.length < 20) {
      // For OpenAI, Anthropic, Google, etc., API keys are usually longer than 20 chars
      // But we'll still allow testing with a warning
      console.warn('API key appears to be shorter than typical API keys');
    }

    try {
      setTesting(true);
      setTestResult(null);
      
      const result = await apiService.testAIConfig({
        provider,
        model,
        apiKey
      });
      
      setTestResult(result);
      
      if (result.success) {
        showToast(t('config.testSuccess'), 'success');
      } else {
        // Simplify error message
        const errorMessage = result.message || t('config.testErrorUnknown');
        const shortMessage = errorMessage.length > 50 ? errorMessage.substring(0, 50) + '...' : errorMessage;
        showToast(t('config.testError') + ': ' + shortMessage, 'error');
      }
    } catch (err: any) {
      // Simplify error message
      const errorMessage = err.message || t('config.testErrorUnknown');
      const shortMessage = errorMessage.length > 50 ? errorMessage.substring(0, 50) + '...' : errorMessage;
      setTestResult({ success: false, message: shortMessage });
      showToast(t('config.testError') + ': ' + shortMessage, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (section: 'ai' | 'registry', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [section]: {
          ...prev.config[section],
          [field]: value
        }
      }
    }));

    // If provider changes, reset model if it's not compatible with the new provider
    if (section === 'ai' && field === 'provider') {
      const selectedProvider = AI_PROVIDERS.find(p => p.id === value);
      if (selectedProvider) {
        const currentModel = formData.config.ai?.model || '';
        if (currentModel && !selectedProvider.models.includes(currentModel) && selectedProvider.models.length > 0) {
          // Reset model if it's not in the new provider's model list
          setFormData(prev => ({
            ...prev,
            config: {
              ...prev.config,
              ai: {
                ...prev.config.ai,
                model: ''
              }
            }
          }));
        }
      }
    }
  };

  // Get available models for the selected provider
  const getAvailableModels = () => {
    const providerId = formData.config.ai?.provider || '';
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    return provider ? provider.models : [];
  };

  // Check if custom model input should be shown
  const shouldShowCustomModelInput = () => {
    const providerId = formData.config.ai?.provider || '';
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    return provider?.id === 'custom' || (provider && provider.models.length === 0);
  };

  if (loading && !config) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={closeToast}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('config.title')}</h1>
        <p className="text-gray-600 mt-2">{t('config.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('config.aiConfiguration')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('config.provider')}
              </label>
              <select
                value={formData.config.ai?.provider || ''}
                onChange={(e) => handleInputChange('ai', 'provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('config.selectProvider')}</option>
                {AI_PROVIDERS.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {t('config.providerDescription')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('config.model')}
              </label>
              {shouldShowCustomModelInput() ? (
                <input
                  type="text"
                  value={formData.config.ai?.model || ''}
                  onChange={(e) => handleInputChange('ai', 'model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('config.modelPlaceholder')}
                />
              ) : (
                <select
                  value={formData.config.ai?.model || ''}
                  onChange={(e) => handleInputChange('ai', 'model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!formData.config.ai?.provider}
                >
                  <option value="">{t('config.selectModel')}</option>
                  {getAvailableModels().map(model => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.config.ai?.provider 
                  ? (shouldShowCustomModelInput() 
                    ? t('config.customModelDescription')
                    : t('config.modelDescription'))
                  : t('config.selectProviderFirst')}
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('config.apiKey')}
              </label>
              <input
                type="password"
                value={formData.config.ai?.apiKey || ''}
                onChange={(e) => handleInputChange('ai', 'apiKey', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('config.apiKeyPlaceholder')}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('config.apiKeyDescription')}
              </p>
              
              {/* Test Configuration Button */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleTestConfig}
                  disabled={testing || !formData.config.ai?.provider || !formData.config.ai?.model || !formData.config.ai?.apiKey}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('config.testing')}
                    </>
                  ) : (
                    t('config.testConfiguration')
                  )}
                </button>
                
                {/* Test Result Display */}
                {testResult && (
                  <div className={`mt-2 p-3 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {testResult.success ? (
                          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                          {testResult.success ? t('config.testSuccess') : t('config.testError')}
                        </p>
                        {testResult.message && (
                          <p className={`mt-1 text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                            {testResult.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="mt-2 text-sm text-gray-500">
                  {t('config.testDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Registry Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('config.registryConfiguration')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('config.defaultRegistry')}
              </label>
              <select
                value={formData.config.registry?.default || ''}
                onChange={(e) => handleInputChange('registry', 'default', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('config.selectDefaultRegistry')}</option>
                <option value="github">GitHub (https://raw.githubusercontent.com/MCPilotX/mcp-server-hub/refs/heads/main/github/&#123;server&#125;/mcp.json)</option>
                <option value="gitee">Gitee (https://gitee.com/mcpilotx/mcp-server-hub/raw/master/&#123;owner&#125;/&#123;server&#125;/mcp.json)</option>
                <option value="direct">Direct (Direct URL or local file path)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('config.fallbackRegistry')}
              </label>
              <select
                value={formData.config.registry?.fallback || ''}
                onChange={(e) => handleInputChange('registry', 'fallback', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('config.selectFallbackRegistry')}</option>
                <option value="github">GitHub (https://raw.githubusercontent.com/MCPilotX/mcp-server-hub/refs/heads/main/github/&#123;server&#125;/mcp.json)</option>
                <option value="custom">Custom (Custom Registry)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={loadConfig}
            className="px-4 py-2 mr-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('config.reset')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? t('config.saving') : t('config.saveConfiguration')}
          </button>
        </div>
      </form>

      {/* Current Configuration Display */}
      {config && (
        <div className="mt-8 bg-gray-50 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('config.currentConfiguration')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('config.aiSettings')}</h3>
              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto">
                {JSON.stringify({
                  ...config.ai,
                  apiKey: config.ai?.apiKey ? '••••••••••••••••' : '(Not set)'
                }, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('config.registrySettings')}</h3>
              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto">
                {JSON.stringify(config.registry, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}