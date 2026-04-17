import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || 'noreply@hallexcosta.com';

export async function sendExistingAccountEmail(email: string): Promise<void> {
  try {
    await resend.emails.send({
      from: `Webhook Receiver <${FROM}>`,
      to: email,
      subject: 'Tentativa de cadastro — Webhook Receiver',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #e5e5e5; border-radius: 8px;">
          <h2 style="margin: 0 0 16px; font-size: 18px;">Webhook Receiver</h2>
          <p style="color: #888; font-size: 14px; line-height: 1.6;">
            Alguem tentou criar uma conta com este email, mas voce ja possui uma conta cadastrada.
          </p>
          <p style="color: #888; font-size: 14px; line-height: 1.6;">
            Se foi voce, use sua passphrase para fazer login. Se nao lembra da passphrase,
            ela foi exibida no momento do cadastro — infelizmente nao e possivel recupera-la por email
            por questoes de seguranca.
          </p>
          <p style="color: #888; font-size: 14px; line-height: 1.6;">
            Se voce <strong>nao</strong> tentou se cadastrar, pode ignorar este email com seguranca.
            Sua conta continua protegida.
          </p>
          <hr style="border: none; border-top: 1px solid #2a2a2a; margin: 24px 0;" />
          <p style="color: #555; font-size: 12px;">
            Este email foi enviado automaticamente pelo Webhook Receiver.
          </p>
        </div>
      `,
    });
  } catch {
    // Silently fail — don't leak email delivery errors to the caller
  }
}
