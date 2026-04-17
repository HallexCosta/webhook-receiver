import { useState } from 'react';
import * as api from '../lib/api';

export function AuthPage({ onAuth }: { onAuth: (passphrase: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [generatedPassphrase, setGeneratedPassphrase] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRegisterMessage('');
    setLoading(true);
    try {
      const data = await api.register(email);
      if (data.passphrase && data.passphraseFormatted) {
        // New account — show passphrase
        setGeneratedPassphrase(data.passphraseFormatted);
      } else {
        // Email already exists — show generic message (email sent in background)
        setRegisterMessage(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(passphrase);
      localStorage.setItem('wh_passphrase', data.passphrase);
      onAuth(data.passphrase);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const raw = generatedPassphrase.replace(/-/g, '');
    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUsePassphrase = () => {
    const raw = generatedPassphrase.replace(/-/g, '');
    localStorage.setItem('wh_passphrase', raw);
    onAuth(raw);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Webhook Receiver</h1>
        <p className="auth-subtitle">Receba e inspecione webhooks facilmente</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'auth-tab-active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setGeneratedPassphrase(''); setRegisterMessage(''); }}
          >
            Entrar
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'auth-tab-active' : ''}`}
            onClick={() => { setMode('register'); setError(''); setRegisterMessage(''); }}
          >
            Cadastrar
          </button>
        </div>

        {mode === 'register' && registerMessage && (
          <div className="register-message">
            <p className="register-message-text">{registerMessage}</p>
            <p className="register-message-hint">
              Se voce ja tem uma conta, use sua passphrase para entrar.
            </p>
            <button
              className="btn btn-primary btn-full"
              onClick={() => { setMode('login'); setRegisterMessage(''); }}
            >
              Ir para login
            </button>
          </div>
        )}

        {mode === 'register' && !generatedPassphrase && !registerMessage && (
          <form onSubmit={handleRegister}>
            <input
              type="email"
              className="input"
              placeholder="Seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-full" disabled={loading || !email}>
              {loading ? 'Gerando...' : 'Gerar Passphrase'}
            </button>
          </form>
        )}

        {mode === 'register' && generatedPassphrase && (
          <div className="passphrase-result">
            <p className="passphrase-warn">
              Salve sua passphrase! Voce precisara dela para acessar.
            </p>
            <div className="passphrase-box">
              <code>{generatedPassphrase}</code>
            </div>
            <div className="passphrase-actions">
              <button className="btn btn-small btn-ghost" onClick={handleCopy}>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button className="btn btn-primary btn-full" onClick={handleUsePassphrase}>
                Ja salvei, acessar agora
              </button>
            </div>
            {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <input
              type="text"
              className="input input-mono"
              placeholder="Cole sua passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-full" disabled={loading || !passphrase}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <a href="/faq" className="auth-link">FAQ — Como funciona?</a>
        </div>
      </div>
    </div>
  );
}
