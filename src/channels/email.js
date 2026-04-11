import { ImapFlow } from 'imapflow';
import { Resend } from 'resend';
import { simpleParser } from 'mailparser';
import { BaseChannel } from './base.js';

export class EmailChannel extends BaseChannel {
  constructor(config) { super(config); this.name = 'email'; }

  _imap() {
    return new ImapFlow({
      host: this.config.host, port: this.config.port || 993,
      secure: true, auth: { user: this.config.user, pass: this.config.password },
      logger: false
    });
  }

  async testConnection() {
    const client = this._imap();
    try {
      await client.connect();
      const s = await client.status('INBOX', { messages: true, unseen: true });
      await client.logout();
      return { ok: true, info: `Connected. ${s.messages} messages, ${s.unseen} unread.` };
    } catch (err) { return { ok: false, info: err.message }; }
  }

  async fetchRecent({ limit = 20, folder = 'INBOX' } = {}) {
    const client = this._imap();
    const messages = [];
    try {
      await client.connect();
      const mailbox = await client.mailboxOpen(folder);
      const total = mailbox.exists;
      if (total === 0) { await client.logout(); return []; }
      const from = Math.max(1, total - limit + 1);
      for await (const msg of client.fetch(`${from}:${total}`, { uid: true, flags: true, envelope: true, source: true })) {
        try { const parsed = await simpleParser(msg.source); messages.push(this.normalise({ msg, parsed })); } catch (_) {}
      }
      await client.logout();
    } catch (err) { try { await client.logout(); } catch (_) {} throw err; }
    return messages.reverse();
  }

  async sendReply(messageId, body, { to, subject } = {}) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const toAddress = process.env.TEST_EMAIL || to;
    const { data, error } = await resend.emails.send({
      from: 'Autopilot <onboarding@resend.dev>',
      to: toAddress,
      subject: subject?.startsWith('Re:') ? subject : `Re: ${subject}`,
      text: body
    });
    if (error) throw new Error(error.message);
    console.log('Email sent via Resend:', data.id);
    return { ok: true, messageId: data.id };
  }

  async archiveMessage(uid, folder = 'INBOX') {
    const client = this._imap();
    try {
      await client.connect(); await client.mailboxOpen(folder);
      try { await client.messageMove(uid, 'Archive', { uid: true }); }
      catch (_) { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); }
      await client.logout(); return { ok: true };
    } catch (err) { try { await client.logout(); } catch (_) {} throw err; }
  }

  normalise({ msg, parsed }) {
    const from = parsed.from?.value?.[0] || {};
    return {
      id: String(msg.uid), channel: 'email',
      from: from.name || from.address || 'Unknown',
      fromAddress: from.address || '',
      subject: parsed.subject || '(no subject)',
      body: parsed.text || parsed.html?.replace(/<[^>]+>/g,'') || '',
      receivedAt: parsed.date || new Date(),
      unread: !msg.flags?.has('\\Seen'), raw: {}
    };
  }
}
