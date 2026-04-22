import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { formatMCPServerName } from '../utils/format';
import type { MCPServer } from '../types';

// Registry sources available
const REGISTRY_SOURCES = [
  { 
    id: 'github', 
    name: 'GitHub Hub', 
    description: 'Search services from MCPilotX GitHub hub',
    downloadUrl: 'https://raw.githubusercontent.com/MCPilotX/mcp-server-hub/refs/heads/main/github/{server}/mcp.json'
  },
  { 
    id: 'gitee', 
    name: 'Gitee Hub', 
    description: 'Search services from MCPilotX Gitee hub',
    downloadUrl: 'https://gitee.com/mcpilotx/mcp-server-hub/raw/master/{owner}/{server}/mcp.json'
  },
  { 
    id: 'direct', 
    name: 'Direct URL', 
    description: 'Direct URL or local file',
    downloadUrl: 'Direct URL or local file path'
  },
];

// Example inputs for each registry source
const REGISTRY_EXAMPLES: Record<string, string[]> = {
  github: ['github/github-mcp-server', 'owner/repo', 'owner/repo@main', 'owner/repo:dist/mcp.json'],
  gitee: ['Joooook/12306-mcp', 'owner/server-name'],
  direct: ['https://example.com/mcp.json', 'file:///path/to/mcp.json', '/local/path/mcp.json'],
};

export default function Servers() {
  const { t } = useLanguage();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pullUrl, setPullUrl] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('github');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    name: string;
    description?: string;
    version?: string;
    source: string;
    tags?: string[];
    lastUpdated?: string;
  }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [startingServers, setStartingServers] = useState<Set<string>>(new Set());

  const loadServers = async () => {
    try {
      setLoading(true);
      const data = await apiService.getServers();
      
      const serverMap = new Map<string, MCPServer>();
      data.forEach(server => {
        const existing = serverMap.get(server.name);
        if (!existing || 
            (server.status === 'running' && existing.status !== 'running') ||
            (server.lastStartedAt && existing.lastStartedAt && 
             server.lastStartedAt > existing.lastStartedAt)) {
          serverMap.set(server.name, server);
        }
      });
      
      const optimizedServers = Array.from(serverMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setServers(optimizedServers);
      setError(null);
    } catch (err: any) {
      setError(err.message || t('servers.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handlePullServer = async () => {
    if (!pullUrl.trim()) {
      setError(t('servers.error.urlRequired'));
      return;
    }

    try {
      setLoading(true);
      // Build the correct server name based on source
      let serverName = pullUrl;
      
      if (selectedSource === 'gitee') {
        // For gitee source, we need to build the full URL to mcp.json
        // Format: https://gitee.com/mcpilotx/mcp-server-hub/raw/master/{owner}/{server}/mcp.json
        // The pullUrl should be in format "owner/server" from search results
        if (serverName.includes('/') && !serverName.startsWith('http')) {
          serverName = `https://gitee.com/mcpilotx/mcp-server-hub/raw/master/${serverName}/mcp.json`;
        }
      } else if (selectedSource === 'github') {
        // For github source, we need to build the full URL to mcp.json
        // Format: https://raw.githubusercontent.com/MCPilotX/mcp-server-hub/refs/heads/main/github/{server}/mcp.json
        // The pullUrl should be in format "github/server-name" from search results
        if (serverName.startsWith('github/') && !serverName.startsWith('http')) {
          const serverPath = serverName.replace('github/', '');
          serverName = `https://raw.githubusercontent.com/MCPilotX/mcp-server-hub/refs/heads/main/github/${serverPath}/mcp.json`;
        } else if (!serverName.includes(':')) {
          // Fallback: add github: prefix for backward compatibility
          serverName = `github:${serverName}`;
        }
      }
      // For direct source, keep as-is (already a URL or file path)
      
      // Check if server is already pulled by trying to get its manifest
      try {
        const servers = await apiService.getServers();
        // Filter out any servers that might not have a name property
        const validServers = servers.filter(s => s && s.name);
        const existingServer = validServers.find(s => s.name === serverName);
        if (existingServer) {
          setError(`Server "${serverName}" is already pulled. You can start it from the list below.`);
          return;
        }
      } catch (checkError) {
        // Ignore check errors, proceed with pull
      }
      
      await apiService.pullServer({ serverName });
      setPullUrl('');
      await loadServers();
    } catch (err: any) {
      setError(err.message || t('servers.error.pullFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleStopServer = async (id: string) => {
    if (!confirm(t('servers.confirmStop'))) {
      return;
    }

    try {
      await apiService.deleteServer(id);
      await loadServers();
    } catch (err: any) {
      setError(err.message || t('servers.error.stopFailed'));
    }
  };

  const handleStartServer = async (serverId: string) => {
    try {
      // Add server to starting set for visual feedback
      setStartingServers(prev => new Set(prev).add(serverId));
      setError(null);
      
      await apiService.startServer({ serverId });
      await loadServers();
    } catch (err: any) {
      setError(err.message || t('servers.error.startFailed'));
    } finally {
      // Remove server from starting set
      setStartingServers(prev => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearchLoading(true);
      const result = await apiService.searchServices(searchQuery, selectedSource);
      setSearchResults(result.services);
      setShowSearchResults(true);
      setError(null);
      
      // Show message if no results found
      if (result.services.length === 0) {
        setError(t('servers.noSearchResults'));
      }
    } catch (err: any) {
      // Show error message if search fails
      setError(err.message || t('servers.error.searchFailed'));
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (serviceName: string, serviceSource?: string) => {
    // Now search returns full name (e.g., "Joooook/12306-mcp") for gitee source
    // So we can directly use it
    setPullUrl(serviceName);
    
    // Update selected source based on the search result
    if (serviceSource) {
      // Map service source to registry source id
      if (serviceSource.includes('github')) {
        setSelectedSource('github');
      } else if (serviceSource.includes('gitee')) {
        setSelectedSource('gitee');
      } else if (serviceSource.includes('direct') || serviceSource.includes('url')) {
        setSelectedSource('direct');
      }
    }
    
    setShowSearchResults(false);
  };

  // Function to generate actual download URL based on selected source and pullUrl
  const getActualDownloadUrl = (): string => {
    const source = REGISTRY_SOURCES.find(s => s.id === selectedSource);
    if (!source) return '';
    
    // For direct source, show the template as-is
    if (selectedSource === 'direct') {
      return source.downloadUrl;
    }
    
    // If no pullUrl is entered, show the template with placeholders
    if (!pullUrl.trim()) {
      return source.downloadUrl;
    }
    
    // Generate actual URL based on source
    if (selectedSource === 'gitee') {
      // For gitee, pullUrl should be in format "owner/server"
      if (pullUrl.includes('/') && !pullUrl.startsWith('http')) {
        return `https://gitee.com/mcpilotx/mcp-server-hub/raw/master/${pullUrl}/mcp.json`;
      }
    } else if (selectedSource === 'github') {
      // For github, pullUrl should be in format "github/server-name" or "owner/repo"
      if (pullUrl.startsWith('github/') && !pullUrl.startsWith('http')) {
        const serverPath = pullUrl.replace('github/', '');
        return `https://raw.githubusercontent.com/MCPilotX/mcp-server-hub/refs/heads/main/github/${serverPath}/mcp.json`;
      } else if (pullUrl.includes('/') && !pullUrl.includes(':')) {
        // Assume it's owner/repo format
        return `github:${pullUrl}`;
      }
    }
    
    // Fallback: return the template
    return source.downloadUrl;
  };

  if (loading && servers.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-900">{t('servers.title')}</h1>
        <p className="text-gray-600 mt-2">{t('servers.subtitle')}</p>
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

      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('servers.pullNewServer')}</h2>
        
        {/* Registry source selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('servers.registrySource')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {REGISTRY_SOURCES.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelectedSource(source.id)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedSource === source.id
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{source.name}</div>
                <div className="text-xs text-gray-500 truncate">{source.description}</div>
              </button>
            ))}
          </div>
          
          {/* Download URL information - Simplified to two lines */}
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {t('servers.downloadUrlInfo')}: {REGISTRY_SOURCES.find(s => s.id === selectedSource)?.name}
                </p>
                <div className="mt-1 p-2 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 break-all">
                  {getActualDownloadUrl()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and input section */}
        <div className="space-y-4">
          {/* Search input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('servers.searchServers')}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder={t('servers.searchPlaceholder', { source: REGISTRY_SOURCES.find(s => s.id === selectedSource)?.name })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searchLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common.searching')}
                  </div>
                ) : (
                  t('common.search')
                )}
              </button>
            </div>
            
            {/* Search results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {t('servers.searchResults')} ({searchResults.length})
                    </span>
                    <button
                      onClick={() => setShowSearchResults(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {searchResults.map((service, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleSelectSearchResult(service.name, service.source)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-gray-600 mt-1">{service.description}</div>
                          )}
                          {service.tags && service.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {service.tags.map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {service.source}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {showSearchResults && searchResults.length === 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {t('servers.noSearchResults')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simplified server input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('servers.pullDescription')}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={pullUrl}
                onChange={(e) => setPullUrl(e.target.value)}
                placeholder={t('servers.pullPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePullServer();
                  }
                }}
              />
              <button
                onClick={handlePullServer}
                disabled={loading || !pullUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('servers.pullingButton') : t('servers.pullButton')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">{t('servers.pulledServers')}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('servers.pulledServersDescription')}
          </p>
        </div>
        
        {servers.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('servers.noServers')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('servers.noServersDesc')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {servers.map((server) => (
              <li key={server.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-3 w-3 rounded-full ${server.status === 'running' ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{formatMCPServerName(server.name)}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500">v{server.version}</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className="text-xs text-gray-500">PID: N/A</span>
                          <span className="mx-2 text-gray-300">•</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${server.status === 'running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {server.status || 'unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {server.status === 'running' ? (
                      <>
                        <button
                          onClick={() => handleStopServer(server.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                          {t('servers.stop')}
                        </button>
                        <button
                          disabled
                          className="px-3 py-1 text-sm bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                        >
                          {t('servers.start')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartServer(server.id)}
                          disabled={startingServers.has(server.id)}
                          className={`px-3 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            startingServers.has(server.id)
                              ? 'bg-green-500 text-white cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                          }`}
                        >
                          {startingServers.has(server.id) ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              {t('servers.starting')}
                            </div>
                          ) : (
                            t('servers.start')
                          )}
                        </button>
                        <button
                          disabled
                          className="px-3 py-1 text-sm bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                        >
                          {t('servers.stop')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
