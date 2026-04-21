import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './services/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Config from './pages/Config';
import Secrets from './pages/Secrets';
import Processes from './pages/Processes';
import Workflows from './pages/Workflows';
import Orchestration from './pages/Orchestration';
import Logs from './pages/Logs';
import Login from './pages/Login';

function App() {
  const isDevelopment = import.meta.env.DEV;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="servers" element={<Servers />} />
                <Route path="processes" element={<Processes />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="orchestration" element={<Orchestration />} />
                <Route path="config" element={<Config />} />
                <Route path="secrets" element={<Secrets />} />
                <Route path="logs" element={<Logs />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Router>
          {isDevelopment && <ReactQueryDevtools initialIsOpen={false} />}
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
