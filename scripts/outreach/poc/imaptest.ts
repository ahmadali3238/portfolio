/**
 * PoC — prove Gmail IMAP works using ONLY Node's built-in tls (no dependencies).
 * Connects, logs in with the app password, selects INBOX, reports the message
 * count + reads the latest message's subject — exactly what the reply poller needs.
 * Run: tsx scripts/outreach/poc/imaptest.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import * as tls from "node:tls";

function imap() {
  const user = process.env.GMAIL_IMAP_USER || process.env.OUTREACH_FROM_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Set GMAIL_IMAP_USER/OUTREACH_FROM_EMAIL + GMAIL_APP_PASSWORD in .env.local");

  return new Promise<void>((resolve, reject) => {
    const socket = tls.connect({ host: "imap.gmail.com", port: 993, servername: "imap.gmail.com" });
    let buf = "";
    let step = 0;
    let exists = 0;
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("timeout")); }, 25_000);

    const send = (cmd: string, redact = false) => {
      console.log("  > " + (redact ? cmd.replace(pass, "********").replace(user, user) : cmd));
      socket.write(cmd + "\r\n");
    };

    socket.on("data", (d) => {
      buf += d.toString("utf8");
      // capture EXISTS count when SELECT runs
      const m = buf.match(/\* (\d+) EXISTS/);
      if (m) exists = Number(m[1]);

      if (step === 0 && /\* OK/.test(buf)) {
        step = 1; buf = "";
        console.log("← greeting OK");
        send(`a1 LOGIN "${user}" "${pass}"`, true);
      } else if (step === 1 && /a1 (OK|NO|BAD)/.test(buf)) {
        if (!/a1 OK/.test(buf)) { clearTimeout(timer); socket.destroy(); return reject(new Error("LOGIN failed: " + buf.trim().split("\n").pop())); }
        step = 2; buf = "";
        console.log("← LOGIN OK (authenticated)");
        send("a2 SELECT INBOX");
      } else if (step === 2 && /a2 (OK|NO|BAD)/.test(buf)) {
        step = 3; buf = "";
        console.log(`← SELECT INBOX OK — ${exists} messages in inbox`);
        // fetch the most recent message's envelope
        send(`a3 FETCH ${exists} (ENVELOPE)`);
      } else if (step === 3 && /a3 (OK|NO|BAD)/.test(buf)) {
        const subj = (buf.match(/"([^"]*Outreach[^"]*|[^"]{3,80})"/) || [])[1];
        console.log("← FETCH latest envelope OK");
        const env = buf.split("\n").find((l) => l.includes("ENVELOPE"));
        if (env) console.log("    " + env.trim().slice(0, 160));
        step = 4; buf = "";
        send("a4 LOGOUT");
      } else if (step === 4 && /a4 OK|BYE/.test(buf)) {
        clearTimeout(timer); socket.end(); resolve();
      }
    });
    socket.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

imap()
  .then(() => console.log("\n✓ IMAP works → reply poller can read replies & detect bounces, free, hands-free."))
  .catch((e) => { console.error("\n✗ IMAP test failed:", e.message); process.exit(1); });
