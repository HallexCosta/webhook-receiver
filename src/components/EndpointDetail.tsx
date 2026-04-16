import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import type { Endpoint } from '../types';
import * as api from '../lib/api';
import { CallDetail } from './CallDetail';
import { timeAgo } from '../lib/time';

export function EndpointDetail({
  id,
  request,
}: {
  id: string;
  request: <T = unknown>(path: string, options?: RequestInit) => Promise<T>;
}) {
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const load = useCallback(async () => {
    try {
      const data = await api.getEndpoint(request, id);
      setEndpoint(data.endpoint);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [request, id, navigate]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  const handleCopy = async () => {
    const url = `${window.location.origin}/api/w/${id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async () => {
    if (!endpoint) return;
    const data = await api.toggleEndpoint(request, id, !endpoint.active);
    setEndpoint(data.endpoint);
  };

  const handleDelete = async () => {
    if (!confirm(`Deletar ${endpoint?.name}?`)) return;
    await api.deleteEndpoint(request, id);
    navigate('/');
  };

  const handleClear = async () => {
    if (!confirm('Limpar todo o historico de chamadas?')) return;
    await api.clearCalls(request, id);
    setEndpoint((prev) => (prev ? { ...prev, calls: [] } : prev));
  };

  if (loading || !endpoint) {
    return <div className="loading">Carregando...</div>;
  }

  const webhookUrl = `${window.location.origin}/api/w/${endpoint.id}`;

  return (
    <div>
      <div className="detail-header">
        <a className="back-link" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          ← Voltar
        </a>
        <div className="detail-title-row">
          <span className="detail-title">{endpoint.name}</span>
          <span className={`badge ${endpoint.active ? 'badge-active' : 'badge-inactive'}`}>
            {endpoint.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <div className="detail-url-row">
          <code className="detail-url">{webhookUrl}</code>
          <button className="btn btn-primary btn-small" onClick={handleCopy}>
            {copied ? 'Copiado!' : 'Copiar URL'}
          </button>
        </div>
        <div className="detail-controls">
          <button
            className={`btn btn-small ${endpoint.active ? 'btn-warning' : 'btn-success'}`}
            onClick={handleToggle}
          >
            {endpoint.active ? 'Desativar' : 'Ativar'}
          </button>
          <button className="btn btn-small btn-ghost" onClick={handleClear}>
            Limpar historico
          </button>
          <button className="btn btn-small btn-danger" onClick={handleDelete}>
            Deletar
          </button>
        </div>
        <div className="detail-info">
          <span>Criado {timeAgo(endpoint.createdAt)}</span>
          <span>{endpoint.calls.length} chamadas</span>
        </div>
      </div>

      <div className="calls-header">
        <h3>Historico de chamadas</h3>
      </div>

      {endpoint.calls.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Nenhuma chamada ainda</p>
          <p className="empty-subtitle">
            Envie um request para a URL acima para ver o historico aqui
          </p>
        </div>
      ) : (
        <div className="calls-list">
          {endpoint.calls.map((call) => (
            <CallDetail key={call.id} call={call} />
          ))}
        </div>
      )}

      <div className="memory-notice">
        Dados armazenados em memoria — serao perdidos ao reiniciar o servidor
      </div>
    </div>
  );
}
