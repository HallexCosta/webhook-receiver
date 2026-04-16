import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { useApi } from './hooks/useApi';
import * as api from './lib/api';
import type { User } from './types';
import { Layout } from './components/Layout';
import { AuthPage } from './components/AuthPage';
import { FaqPage } from './components/FaqPage';
import { EndpointList } from './components/EndpointList';
import { EndpointDetail } from './components/EndpointDetail';

export function App() {
  const [passphrase, setPassphrase] = useState<string | null>(
    () => localStorage.getItem('wh_passphrase'),
  );
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const { request } = useApi(passphrase || '');

  useEffect(() => {
    if (!passphrase) {
      setChecking(false);
      return;
    }
    api.getMe(passphrase)
      .then((data) => { setUser(data); setChecking(false); })
      .catch(() => {
        localStorage.removeItem('wh_passphrase');
        setPassphrase(null);
        setChecking(false);
      });
  }, [passphrase]);

  const handleAuth = (newPassphrase: string) => {
    setPassphrase(newPassphrase);
  };

  const handleLogout = () => {
    localStorage.removeItem('wh_passphrase');
    setPassphrase(null);
    setUser(null);
  };

  // FAQ is always accessible
  return (
    <Switch>
      <Route path="/faq">
        <FaqPage />
      </Route>
      <Route>
        {() => {
          if (checking) {
            return <div className="loading">Carregando...</div>;
          }

          if (!passphrase || !user) {
            return <AuthPage onAuth={handleAuth} />;
          }

          return (
            <Layout user={user} onLogout={handleLogout}>
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
        }}
      </Route>
    </Switch>
  );
}
