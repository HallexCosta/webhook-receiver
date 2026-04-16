import type { ReactNode } from 'react';
import type { User } from '../types';

export function Layout({
  children,
  user,
  onLogout,
}: {
  children: ReactNode;
  user: User;
  onLogout: () => void;
}) {
  const tierLabel = user.tier === 'paid' ? 'Pro' : 'Free tier';

  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <a href="/" className="logo">Webhook Receiver</a>
          <div className="header-right">
            <span className="header-badge">{tierLabel}</span>
            <span className="header-email">{user.email}</span>
            <a href="/faq" className="header-link">FAQ</a>
            <button className="btn btn-ghost btn-small" onClick={onLogout}>Sair</button>
          </div>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
