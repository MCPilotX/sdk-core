import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import type { Secret, CreateSecretRequest } from '../types';

export default function SecretsPage() {
  const { t } = useLanguage();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSecret, setNewSecret] = useState<CreateSecretRequest>({
    name: '',
    value: '',
    description: ''
  });

  const loadSecrets = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSecrets();
      setSecrets(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || t('secrets.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecrets();
  }, []);

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiService.createSecret(newSecret);
      setNewSecret({ name: '', value: '', description: '' });
      setShowCreateForm(false);
      await loadSecrets();
      setError(null);
    } catch (err: any) {
      setError(err.message || t('secrets.error.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSecret = async (name: string) => {
    if (!confirm(t('secrets.confirmDelete', { name }))) {
      return;
    }

    try {
      await apiService.deleteSecret(name);
      await loadSecrets();
    } catch (err: any) {
      setError(err.message || t('secrets.error.deleteFailed'));
    }
  };

  if (loading && secrets.length === 0) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('secrets.title')}</h1>
        <p className="text-gray-600 mt-2">{t('secrets.subtitle')}</p>
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

      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showCreateForm ? t('secrets.cancel') : t('secrets.createNewSecret')}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('secrets.createNewSecret')}</h2>
          <form onSubmit={handleCreateSecret} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('secrets.secretName')}
              </label>
              <input
                type="text"
                value={newSecret.name}
                onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('secrets.secretNamePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('secrets.secretValue')}
              </label>
              <input
                type="password"
                value={newSecret.value}
                onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('secrets.secretValuePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('secrets.description')}
              </label>
              <textarea
                value={newSecret.description}
                onChange={(e) => setNewSecret({ ...newSecret, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('secrets.descriptionPlaceholder')}
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? t('secrets.creating') : t('secrets.createSecret')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">{t('secrets.storedSecrets')}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('secrets.storedSecretsDescription')}
          </p>
        </div>
        
        {secrets.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('secrets.noSecrets')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('secrets.noSecretsDescription')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {secrets.map((secret) => (
              <li key={secret.name} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{secret.name}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500">
                            {t('secrets.lastUpdated')}: {new Date(secret.lastUpdated).toLocaleDateString()}
                          </span>
                          {secret.description && (
                            <>
                              <span className="mx-2 text-gray-300">•</span>
                              <span className="text-xs text-gray-500">{secret.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleDeleteSecret(secret.name)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      {t('secrets.delete')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">{t('secrets.securityNotice')}</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{t('secrets.securityNotice1')}</p>
              <p>{t('secrets.securityNotice2')}</p>
              <p>{t('secrets.securityNotice3')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}