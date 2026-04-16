import { useState } from 'react';
import type { WebhookCall } from '../types';
import { timeAgo } from '../lib/time';

function formatBody(body: string | null, contentType: string | null): string {
  if (!body) return '(vazio)';
  if (contentType?.includes('application/json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

export function CallDetail({ call }: { call: WebhookCall }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="call-row">
      <div className="call-summary" onClick={() => setOpen(!open)}>
        <span className={`method-badge method-${call.method}`}>
          {call.method}
        </span>
        {call.contentType && (
          <span className="call-content-type">{call.contentType}</span>
        )}
        {call.ip && (
          <span className="call-content-type">{call.ip}</span>
        )}
        <span className="call-time">{timeAgo(call.timestamp)}</span>
      </div>
      {open && (
        <div className="call-detail">
          {call.body !== null && (
            <div className="call-section">
              <div className="call-section-title">Body</div>
              <pre className="call-body">
                {formatBody(call.body, call.contentType)}
              </pre>
            </div>
          )}
          <div className="call-section">
            <div className="call-section-title">Headers</div>
            <table className="headers-table">
              <tbody>
                {Object.entries(call.headers).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.keys(call.query).length > 0 && (
            <div className="call-section">
              <div className="call-section-title">Query Params</div>
              <table className="headers-table">
                <tbody>
                  {Object.entries(call.query).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
