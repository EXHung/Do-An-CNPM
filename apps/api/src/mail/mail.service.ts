import { Injectable, Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';

export type EmailDelivery = 'SENT' | 'FAILED' | 'DISABLED';
export type InvitationMail = { to: string; token: string; workspaceName: string; inviterName: string; roleName: string; expiresAt: Date };

const TIMEOUT_MS = 10000;

function smtpConfig() {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
  return { host, user, pass, any: Boolean(host || user || pass), complete: Boolean(host && user && pass) };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const smtp = smtpConfig();
    if (smtp.any && !smtp.complete) throw new Error('Email requires SMTP_HOST, SMTP_USER and SMTP_PASS together.');
  }

  /** Never throws: the invitation already exists, so the caller reports the delivery result instead. */
  async sendInvitation(mail: InvitationMail): Promise<EmailDelivery> {
    const smtp = smtpConfig();
    if (!smtp.complete) return 'DISABLED';
    const port = Number(process.env.SMTP_PORT ?? 587);
    const origin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
    // The fragment is not sent to the web server, so the token stays out of its access logs.
    const link = `${origin}/#invite=${mail.token}`;
    const expires = mail.expiresAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const safe = { inviter: escapeHtml(mail.inviterName), workspace: escapeHtml(mail.workspaceName), role: escapeHtml(mail.roleName) };
    try {
      const transport = createTransport({
        host: smtp.host, port, secure: port === 465, requireTLS: port === 587,
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: TIMEOUT_MS, greetingTimeout: TIMEOUT_MS, socketTimeout: TIMEOUT_MS,
      });
      await transport.sendMail({
        from: { name: process.env.MAIL_FROM_NAME ?? 'Orbit', address: process.env.MAIL_FROM_EMAIL ?? smtp.user as string },
        to: mail.to,
        subject: `${mail.inviterName} mời bạn tham gia ${mail.workspaceName} trên Orbit`,
        html: `<p>${safe.inviter} mời bạn tham gia không gian <strong>${safe.workspace}</strong> trên Orbit với vai trò ${safe.role}.</p><p><a href="${link}">Tham gia không gian</a></p><p>Hãy đăng nhập hoặc đăng ký bằng đúng địa chỉ email này. Lời mời hết hạn ngày ${expires}.</p><p>Nếu liên kết không mở được, dán mã sau vào mục "Bạn có mã mời?":<br><code>${mail.token}</code></p>`,
        text: `${mail.inviterName} mời bạn tham gia không gian ${mail.workspaceName} trên Orbit với vai trò ${mail.roleName}.\n\nTham gia: ${link}\n\nHãy đăng nhập hoặc đăng ký bằng đúng địa chỉ email này. Lời mời hết hạn ngày ${expires}.\n\nMã mời: ${mail.token}`,
      });
      return 'SENT';
    } catch (error: unknown) {
      // Only the error code: SMTP messages can echo addresses or account details.
      const code = (error as { code?: unknown } | null)?.code;
      this.logger.error(`Could not send an invitation email: ${typeof code === 'string' ? code : 'unknown error'}.`);
      return 'FAILED';
    }
  }
}
