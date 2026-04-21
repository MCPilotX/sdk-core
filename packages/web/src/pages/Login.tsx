import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Login() {
  const { t } = useLanguage();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Save token to localStorage
      localStorage.setItem('auth_token', token);
      
      // Test the token by making an authenticated API call
      // Use a simple endpoint that requires authentication
      try {
        // Try to get servers list which requires authentication
        await apiService.getServers();
        // If successful, navigate to dashboard
        navigate('/');
      } catch (authError) {
        // If authentication fails, try to verify if token is valid
        try {
          const isValid = await apiService.verifyToken();
          if (isValid) {
            // Token is valid but getServers failed for other reasons
            setError(t('login.error.serverError'));
          } else {
            // Token is invalid
            setError(t('login.error.invalidToken'));
          }
        } catch (verifyError) {
          // If verifyToken fails, check if server is reachable
          const isHealthy = await apiService.healthCheck();
          if (isHealthy) {
            // Server is reachable but token is invalid
            setError(t('login.error.invalidToken'));
          } else {
            setError(t('login.error.cannotConnect'));
          }
        }
        localStorage.removeItem('auth_token');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`${t('login.error.authenticationFailed')}: ${err instanceof Error ? err.message : String(err)}`);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const handleGetToken = async () => {
    try {
      setError('');
      // Try to get token from daemon (public endpoint)
      const response = await fetch('http://localhost:9658/api/auth/token', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors', // Explicitly request CORS mode
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          setToken(data.token);
        } else {
          setError(t('login.error.tokenNotFound'));
        }
      } else {
        const errorText = await response.text();
        setError(`${t('login.error.cannotGetToken')} (HTTP ${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.error('Error getting token:', err);
      setError(`${t('login.error.cannotConnect')}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {t('login.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('login.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                {t('login.authenticationToken')}
              </label>
              <div className="mt-1">
                <input
                  id="token"
                  name="token"
                  type="password"
                  autoComplete="off"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('login.tokenPlaceholder')}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {t('login.tokenDescription')}
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('login.loggingIn') : t('login.login')}
              </button>

              <button
                type="button"
                onClick={handleGetToken}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('login.getTokenFromDaemon')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t('login.howToGetToken')}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-gray-600 space-y-2">
                <p>{t('login.step1')}</p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                  intorch daemon start
                </pre>
                <p>{t('login.step2')}</p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                  Generated new authentication token<br />
                  Token: a1b2c3d4e5f678901234567890123456789012345678901234567890123456<br />
                  Note: Save this token for web UI authentication
                </pre>
                <p>{t('login.step3')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}