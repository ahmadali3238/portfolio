/** Pluggable sender (§6): draft | gmail | smtp | export. The portfolio domain is never the
 *  From address, so it carries zero email-reputation risk in any mode. */
import { existsSync } from "node:fs";
import nodemailer from "nodemailer";
import type { OutreachConfig } from "../config";

export interface SendInput {
  to: string; subject: string; body: string;
  attachResume?: boolean;
}
export interface SendResult { status: "sent" | "drafted" | "exported" | "failed"; composeUrl?: string; messageId?: string; error?: string; }

/** Gmail compose deep-link — opens a prefilled compose window; you click Send (free, 0 risk). */
export function composeUrl(to: string, subject: string, body: string): string {
  const q = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${q.toString()}`;
}

let transporter: nodemailer.Transporter | null = null;
function smtp(cfg: OutreachConfig) {
  if (transporter) return transporter;
  const isGmail = cfg.sendMode === "gmail";
  transporter = nodemailer.createTransport(isGmail
    ? { host: "smtp.gmail.com", port: 587, secure: false, auth: { user: cfg.fromEmail, pass: process.env.GMAIL_APP_PASSWORD } }
    : { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  return transporter;
}

export async function send(input: SendInput, cfg: OutreachConfig): Promise<SendResult> {
  if (cfg.sendMode === "draft") {
    return { status: "drafted", composeUrl: composeUrl(input.to, input.subject, input.body) };
  }
  if (cfg.sendMode === "export") {
    return { status: "exported" }; // CSV is written by the caller in bulk
  }
  // gmail | smtp → actually send
  try {
    const attachments: any[] = [];
    if (input.attachResume && existsSync(cfg.resumePath)) attachments.push({ path: cfg.resumePath });
    const info = await smtp(cfg).sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: input.to, subject: input.subject, text: input.body,
      attachments,
    });
    return { status: "sent", messageId: info.messageId };
  } catch (e) {
    return { status: "failed", error: (e as Error).message };
  }
}

export function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map((f) => `"${String(f ?? "").replace(/"/g, '""')}"`).join(",");
}
