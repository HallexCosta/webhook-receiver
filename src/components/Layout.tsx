import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <a href="/" className="logo">Webhook Receiver</a>
          <span className="header-badge">Free tier — dados expiram em 24h</span>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
