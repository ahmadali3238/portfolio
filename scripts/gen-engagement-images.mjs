// Generates branded cover images for the Key Engagements (SVG -> PNG via sharp).
// Run: node scripts/gen-engagement-images.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "engagements");
mkdirSync(OUT, { recursive: true });

const motifs = {
  rfid: `<g transform="translate(770,150)" stroke="#ffffff" stroke-width="14" fill="none" opacity="0.18" stroke-linecap="round" stroke-linejoin="round">
    <rect x="0" y="60" width="230" height="160" rx="22"/>
    <rect x="36" y="104" width="70" height="50" rx="8"/>
    <path d="M262 80 q58 80 0 160"/>
    <path d="M304 50 q100 110 0 220"/>
    <path d="M346 20 q140 140 0 280"/>
  </g>`,
  broadcast: `<g transform="translate(790,160)" stroke="#ffffff" stroke-width="14" fill="none" opacity="0.18" stroke-linecap="round" stroke-linejoin="round">
    <rect x="0" y="70" width="210" height="150" rx="18"/>
    <path d="M210 108 l72 -36 v122 l-72 -36 z"/>
    <circle cx="66" cy="145" r="36"/>
    <path d="M312 50 q70 95 0 190"/>
    <path d="M352 22 q108 122 0 246"/>
  </g>`,
  warehouse: `<g transform="translate(800,140)" stroke="#ffffff" stroke-width="14" fill="none" opacity="0.18" stroke-linecap="round" stroke-linejoin="round">
    <rect x="0" y="190" width="96" height="96"/>
    <rect x="108" y="190" width="96" height="96"/>
    <rect x="216" y="190" width="96" height="96"/>
    <rect x="54" y="88" width="96" height="96"/>
    <rect x="162" y="88" width="96" height="96"/>
    <path d="M260 64 v-54 M232 38 l28 -28 l28 28"/>
  </g>`,
  vehicle: `<g opacity="0.18">
    <g transform="translate(770,180)" stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M0 150 v-100 h180 l56 56 v44 z"/>
      <circle cx="58" cy="160" r="30"/>
      <circle cx="190" cy="160" r="30"/>
    </g>
    <text x="1015" y="150" font-family="Arial, Helvetica, sans-serif" font-size="150" fill="#ffffff" font-weight="800">25</text>
  </g>`,
};

const cards = [
  { file: "rfid", g1: "#1d4ed8", g2: "#4f46e5", accent: "#93c5fd",
    eyebrow: "RFID Asset Tracking", l1: "RFID Fixed-Asset", l2: "Tagging & Audit", motif: motifs.rfid },
  { file: "broadcast", g1: "#6d28d9", g2: "#9333ea", accent: "#d8b4fe",
    eyebrow: "Asset Planning", l1: "Broadcast Asset", l2: "Planning", motif: motifs.broadcast },
  { file: "warehouse", g1: "#0f766e", g2: "#0e7490", accent: "#5eead4",
    eyebrow: "Warehouse Operations", l1: "Warehouse Ops", l2: "& Promotion", motif: motifs.warehouse },
  { file: "vehicle", g1: "#4338ca", g2: "#1d4ed8", accent: "#a5b4fc",
    eyebrow: "Logistics & Delivery", l1: "25-Vehicle", l2: "Delivery Program", motif: motifs.vehicle },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svg = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.g1}"/>
      <stop offset="1" stop-color="${c.g2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect width="1200" height="800" fill="#000000" opacity="0.10"/>
  ${c.motif}
  <text x="80" y="468" font-family="Arial, Helvetica, sans-serif" font-size="27" letter-spacing="6" fill="#ffffff" opacity="0.9" font-weight="700">${esc(c.eyebrow.toUpperCase())}</text>
  <text x="80" y="556" font-family="Arial, Helvetica, sans-serif" font-size="74" fill="#ffffff" font-weight="800">${esc(c.l1)}</text>
  <text x="80" y="644" font-family="Arial, Helvetica, sans-serif" font-size="74" fill="#ffffff" font-weight="800">${esc(c.l2)}</text>
  <rect x="82" y="694" width="120" height="9" rx="4" fill="${c.accent}"/>
</svg>`;

for (const c of cards) {
  const png = join(OUT, `${c.file}.png`);
  await sharp(Buffer.from(svg(c))).png().toFile(png);
  console.log("wrote", png);
}
console.log("done");
