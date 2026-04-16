import type { ReactNode } from 'react';

export function Layout({
  children,
  onLogout,
}: {
  children: ReactNode;
  onLogout: () => void;
}) {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-inner">
          <h1 className="logo">Webhook Receiver</h1>
          <button className="btn btn-ghost" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
