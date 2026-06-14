/**
 * PoC #4 — Send a test email to YOURSELF via Gmail SMTP (free, no domain).
 * Goal: prove the "send without opening Gmail" path works and check how it lands
 * (inbox vs spam) BEFORE emailing any real prospect.
 *
 * Run: pnpm outreach:poc:send
 * Requires: OUTREACH_FROM_EMAIL (your Gmail) + GMAIL_APP_PASSWORD
 *   (Google account → Security → 2-Step Verification → App passwords).
 * Sends only to yourself (OUTREACH_FROM_EMAIL). Safe.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import nodemailer from "nodemailer";

async function main() {
  const from = process.env.OUTREACH_FROM_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const name = process.env.OUTREACH_FROM_NAME || "Ahmad Ali";
  if (!from || !pass) {
    throw new Error("Set OUTREACH_FROM_EMAIL and GMAIL_APP_PASSWORD in .env.local");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: from, pass },
  });

  console.log("→ Verifying SMTP connection…");
  await transporter.verify();
  console.log("  SMTP auth OK.\n");

  const subject = "Outreach Engine — test send ✅";
  const body =
    "This is a test from your Outreach Engine PoC.\n\n" +
    "If you're reading this in your INBOX (not spam), the free Gmail send path works.\n" +
    "Real emails will be personalized per lead and include a compliance footer.\n\n" +
    "—\n" + name + " · ahmadalibusiness3238@gmail.com\n" +
    "[Your postal address] · Reply \"unsubscribe\" to opt out.";

  console.log(`→ Sending test email to yourself (${from})…`);
  const info = await transporter.sendMail({
    from: `"${name}" <${from}>`,
    to: from,
    subject,
    text: body,
  });

  console.log("  messageId:", info.messageId);
  console.log("  response: ", info.response);
  console.log("\n✓ Sent. Check your inbox AND spam folder — note which one it lands in.");
  console.log("  (Landing in spam from a free Gmail = expected at scale; a dedicated");
  console.log("   warmed domain fixes it. For low volume to yourself it should inbox.)");
}

main().catch((err) => {
  console.error("\n✗ Send PoC failed:", err.message);
  process.exit(1);
});
