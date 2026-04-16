import { useState } from 'react';
import { Route, Switch } from 'wouter';
import { nanoid } from 'nanoid';
import { useApi } from './hooks/useApi';
import { Layout } from './components/Layout';
import { EndpointList } from './components/EndpointList';
import { EndpointDetail } from './components/EndpointDetail';

function getSessionToken(): string {
  let token = localStorage.getItem('wh_session_token');
  if (!token) {
    token = nanoid(21);
    localStorage.setItem('wh_session_token', token);
  }
  return token;
}

export function App() {
  const [token] = useState(getSessionToken);
  const { request } = useApi(token);

  return (
    <Layout>
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
