export function FaqPage() {
  return (
    <div className="faq-page">
      <div className="faq-container">
        <a href="/" className="back-link">← Voltar</a>
        <h1 className="faq-title">FAQ — Perguntas Frequentes</h1>

        <section className="faq-section">
          <h2>O que e o Webhook Receiver?</h2>
          <p>
            Uma ferramenta gratuita para receber, inspecionar e encaminhar webhooks.
            Crie endpoints, envie webhooks para eles e veja o payload, headers e metadados
            de cada chamada em tempo real.
          </p>
        </section>

        <section className="faq-section">
          <h2>Plano Gratuito (Freemium)</h2>
          <p>O plano gratuito inclui:</p>
          <ul>
            <li><strong>3 endpoints</strong> por conta</li>
            <li><strong>25 chamadas</strong> armazenadas por endpoint</li>
            <li><strong>24 horas</strong> de retencao de dados</li>
            <li><strong>Webhook forwarding</strong> (encaminhamento)</li>
            <li><strong>Sem anuncios</strong> invasivos</li>
          </ul>
          <div className="faq-notice">
            <strong>Bom saber:</strong> Como o plano gratuito roda em infraestrutura compartilhada,
            seus dados podem ser resetados eventualmente — por exemplo, durante atualizacoes
            ou manutencoes na plataforma. Nada de mais: e so criar novos endpoints quando precisar.
            Em troca, voce tem acesso completo a ferramenta, sem pagar nada e sem anuncios chatos.
          </div>
        </section>

        <section className="faq-section">
          <h2>Plano Pago (Em Breve)</h2>
          <p>O plano pago tera:</p>
          <ul>
            <li><strong>10 endpoints</strong> por conta</li>
            <li><strong>100 chamadas</strong> por endpoint</li>
            <li><strong>Dados persistentes</strong> — sem expiracao, sem spots</li>
            <li><strong>Suporte prioritario</strong></li>
          </ul>
          <p className="faq-muted">Estamos trabalhando nisso. Em breve disponivel.</p>
        </section>

        <section className="faq-section">
          <h2>Como funciona a passphrase?</h2>
          <p>
            Ao se cadastrar com seu email, o sistema gera uma passphrase unica (um hash SHA-256).
            Essa passphrase e sua chave de acesso — guarde-a em um lugar seguro.
            Se perder, basta cadastrar novamente com o mesmo email para recupera-la.
          </p>
        </section>

        <section className="faq-section">
          <h2>Meus dados sao seguros?</h2>
          <p>
            Os dados sao armazenados em Redis (Upstash) com criptografia em transito.
            No plano gratuito, os dados expiram automaticamente em 24 horas e estao sujeitos
            a limpeza (spots). No plano pago (futuro), os dados serao persistentes.
          </p>
        </section>

        <section className="faq-section">
          <h2>Tem limite de tentativas de login?</h2>
          <p>
            Sim. Apos 3 tentativas erradas, sua conta e bloqueada por 1 hora.
            Se errar mais 3 vezes apos o desbloqueio, o tempo de bloqueio triplica
            (3 horas, 9 horas, etc). Isso protege contra ataques de forca bruta.
          </p>
        </section>
      </div>
    </div>
  );
}
