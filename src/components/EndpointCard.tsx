import { useState } from 'react';
import type { EndpointSummary } from '../types';
import { timeAgo } from '../lib/time';

export function EndpointCard({
  endpoint,
  onToggle,
  onDelete,
  onClick,
}: {
  endpoint: EndpointSummary;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${window.location.origin}/api/w/${endpoint.id}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(endpoint.id, !endpoint.active);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Deletar ${endpoint.name}?`)) {
      onDelete(endpoint.id);
    }
  };

  return (
    <div className="card card-clickable" onClick={onClick}>
      <div className="card-top">
        <div className="card-title-row">
          <span className="card-name">{endpoint.name}</span>
          <span className={`badge ${endpoint.active ? 'badge-active' : 'badge-inactive'}`}>
            {endpoint.active ? 'Ativo' : 'Inativo'}
          </span>
          {endpoint.forwardUrl && (
            <span className="badge badge-forward">Forwarding</span>
          )}
        </div>
        <div className="card-url" onClick={(e) => e.stopPropagation()}>
          <code>{webhookUrl}</code>
          <button className="btn btn-small btn-ghost" onClick={handleCopy}>
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
      <div className="card-bottom">
        <span className="card-meta">{endpoint.callCount} chamadas</span>
        <span className="card-meta">{timeAgo(endpoint.createdAt)}</span>
        <div className="card-actions">
          <button
            className={`btn btn-small ${endpoint.active ? 'btn-warning' : 'btn-success'}`}
            onClick={handleToggle}
          >
            {endpoint.active ? 'Desativar' : 'Ativar'}
          </button>
          <button className="btn btn-small btn-danger" onClick={handleDelete}>
            Deletar
          </button>
        </div>
      </div>
    </div>
  );
}
