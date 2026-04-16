import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import type { EndpointSummary } from '../types';
import * as api from '../lib/api';
import { EndpointCard } from './EndpointCard';

export function EndpointList({
  request,
}: {
  request: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
}) {
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  const load = useCallback(async () => {
    try {
      const data = await api.listEndpoints(request);
      setEndpoints(data.endpoints);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const data = await api.createEndpoint(request);
    navigate(`/endpoints/${data.endpoint.id}`);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await api.toggleEndpoint(request, id, active);
    setEndpoints((prev) =>
      prev.map((ep) => (ep.id === id ? { ...ep, active } : ep)),
    );
  };

  const handleDelete = async (id: string) => {
    await api.deleteEndpoint(request, id);
    setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
      <div className="list-header">
        <h2>Endpoints</h2>
        <button className="btn btn-primary" onClick={handleCreate}>
          + Novo Endpoint
        </button>
      </div>
      {endpoints.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Nenhum endpoint ainda</p>
          <p className="empty-subtitle">Crie seu primeiro endpoint para comecar a receber webhooks</p>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Criar Endpoint
          </button>
        </div>
      ) : (
        <div className="endpoint-grid">
          {endpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onClick={() => navigate(`/endpoints/${ep.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
