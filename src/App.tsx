import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { useApi, AuthError } from './hooks/useApi';
import * as api from './lib/api';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { EndpointList } from './components/EndpointList';
import { EndpointDetail } from './components/EndpointDetail';

export function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('wh_token'),
  );
  const [checking, setChecking] = useState(true);
  const { request } = useApi(token);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .listEndpoints(request)
      .then(() => setChecking(false))
      .catch((err) => {
        if (err instanceof AuthError) {
          setToken(null);
          localStorage.removeItem('wh_token');
        }
        setChecking(false);
      });
  }, [token, request]);

  const handleLogin = async (password: string) => {
    const data = await api.login(request, password);
    localStorage.setItem('wh_token', data.token);
    setToken(data.token);
  };

  const handleLogout = () => {
    localStorage.removeItem('wh_token');
    setToken(null);
  };

  if (checking) {
    return <div className="loading">Carregando...</div>;
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout onLogout={handleLogout}>
      <Switch>
        <Route path="/">
          <EndpointList request={request} />
        </Route>
        <Route path="/endpoints/:id">
          {(params) => <EndpointDetail id={params.id} request={request} />}
        </Route>
      </Switch>
    </Layout>
  );
}
