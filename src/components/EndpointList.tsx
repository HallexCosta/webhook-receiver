import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import type { EndpointSummary, SessionLimits } from '../types';
import * as api from '../lib/api';
import { EndpointCard } from './EndpointCard';

export function EndpointList({
  request,
}: {
  request: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
}) {
  const [endpoints, setEndpoints] = useState<EndpointSummary[]>([]);
  const [limits, setLimits] = useState<SessionLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  const load = useCallback(async () => {
    try {
      const data = await api.listEndpoints(request);
      setEndpoints(data.endpoints);
      setLimits(data.limits);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      const data = await api.createEndpoint(request);
      navigate(`/endpoints/${data.endpoint.id}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Limite')) {
        alert('Limite de endpoints atingido (3/3)');
      }
    }
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
    if (limits) {
      setLimits({ ...limits, endpointsUsed: limits.endpointsUsed - 1 });
    }
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  const atLimit = limits ? limits.endpointsUsed >= limits.endpointsMax : false;

  return (
    <div>
      <div className="list-header">
        <div>
          <h2>Endpoints</h2>
          {limits && (
            <span className="limit-badge">
              {limits.endpointsUsed}/{limits.endpointsMax} endpoints
              — max {limits.callsMaxPerEndpoint} chamadas cada
            </span>
          )}
        </div>
        <button
          className={`btn btn-primary ${atLimit ? 'btn-disabled' : ''}`}
          onClick={handleCreate}
          disabled={atLimit}
          title={atLimit ? 'Limite atingido' : ''}
        >
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
