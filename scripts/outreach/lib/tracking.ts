/** First-party tracked links (§6.7). Rewrites known links in the email body to a redirect
 *  on your own site (/r/<token>?u=<target>) so clicks are logged — no spam-flagging pixel. */
import type { OutreachConfig } from "./config";

export function trackedUrl(cfg: OutreachConfig, token: string, target: string, destination: string): string {
  if (!token || !cfg.siteUrl) return destination;
  return `${cfg.siteUrl.replace(/\/$/, "")}/r/${token}?u=${target}&to=${encodeURIComponent(destination)}`;
}

/** Rewrite portfolio + booking links in a body to tracked redirects. */
export function applyTracking(body: string, cfg: OutreachConfig, token: string): string {
  let out = body;
  if (cfg.portfolioUrl) out = out.split(cfg.portfolioUrl).join(trackedUrl(cfg, token, "portfolio", cfg.portfolioUrl));
  if (cfg.bookingUrl) out = out.split(cfg.bookingUrl).join(trackedUrl(cfg, token, "booking", cfg.bookingUrl));
  return out;
}
