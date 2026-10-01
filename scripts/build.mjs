// Rebuilds this list from the BotsDots open-data catalog.
//   node scripts/build.mjs                 (fetches https://botsdots.site/catalog.json)
//   node scripts/build.mjs path/to.json    (uses a local file)
// Writes README.md, categories/*.md and catalog.json. Safe to run repeatedly.
import fs from "node:fs/promises";

const SOURCE = process.argv[2] || "https://botsdots.site/catalog.json";
const SITE = "https://botsdots.site";
const TOP = 20; // per category in the README; the full list lives in categories/<key>.md

const CATEGORIES = [
  ["personal-admin", "Personal & Life", "Life admin, planning, health, learning, travel and habits."],
  ["research-briefings", "Research & Briefings", "News digests, market and competitor watch, paper summaries."],
  ["content-publishing", "Content & Publishing", "Writing, threads, newsletters, video scripts and social."],
  ["inbox-calendar", "Inbox & Calendar", "Email triage, reply drafts, meeting prep and scheduling."],
  ["coding-shipping", "Coding & Shipping", "PR review, issue triage, CI, release notes and docs."],
  ["teams-handoffs", "Teams & Handoffs", "Chief-of-staff bots, standups, handoffs and multi-bot teams."],
  ["customer-sales", "Sales & Customers", "Lead research, outreach drafts, CRM hygiene and support."],
  ["finance-ops", "Finance & Ops", "Trading research, budgets, invoices and business ops."],
];
const RISK = { low: "🟢", medium: "🟡", high: "🔴" };
const CADENCE = { "on-demand": "on demand", hourly: "hourly", daily: "daily", weekly: "weekly", monthly: "monthly" };

const raw = SOURCE.startsWith("http") ? await (await fetch(SOURCE)).text() : await fs.readFile(SOURCE, "utf8");
const data = JSON.parse(raw);
const all = data.templates.filter((t) => t.name && t.add);
if (all.length < 1000) throw new Error(`Catalog looks incomplete (${all.length} rows) — refusing to overwrite the list.`);

const esc = (s) => String(s).replace(/\s+/g, " ").replace(/([\\`*_[\]<>|#])/g, "\\$1").trim();
const anchor = (s) => s.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
const byScore = (a, b) => b.score - a.score || a.name.localeCompare(b.name);
const fmt = (n) => n.toLocaleString("en-US");

function line(t) {
  const who = t.creator?.handle ? ` — by [@${esc(t.creator.handle)}](https://x.com/${t.creator.handle})` : t.creator?.name ? ` — by ${esc(t.creator.name)}` : "";
  const tags = [RISK[t.risk], CADENCE[t.cadence], t.official ? "⭐ official" : ""].filter(Boolean).join(" · ");
  return `- **[${esc(t.name)}](${t.add})** — ${esc(t.summary)} <sub>${tags}${who} · [details](${t.page})</sub>`;
}

const counts = Object.fromEntries(CATEGORIES.map(([k]) => [k, all.filter((t) => t.category === k).length]));
const official = all.filter((t) => t.official).sort(byScore);
const creators = new Set(all.map((t) => t.creator?.handle).filter(Boolean)).size;
const updated = data.generated.slice(0, 10);

const legend = `**Legend:** 🟢 needs no account access · 🟡 connects accounts (email, calendar, repos…) · 🔴 can move money, publish or delete · ⭐ in xAI's official marketplace. Every link opens the bot's official **x.ai** share page.`;

let readme = `# Awesome Grok Bot Templates [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated, link-checked list of **${fmt(all.length)} public Grok Bot templates** from **${fmt(creators)} creators** — organised by job, with an access rating and schedule for every bot.

![Templates](https://img.shields.io/badge/templates-${all.length}-c6f432?style=flat-square) ![Updated](https://img.shields.io/badge/updated-${updated.replace(/-/g, "--")}-0b0c0f?style=flat-square) ![License](https://img.shields.io/badge/data-CC0%20%2F%20CC%20BY%204.0-blue?style=flat-square)

**🔎 Search, filter and compare them all at [botsdots.site](${SITE})** — filter by category, schedule, app (Gmail, GitHub, Slack…) and access level; save a shortlist; submit your own bot.

A *Grok Bot template* is a public \`x.ai/bot/…\` link that copies someone's Grok Bot setup — instructions, skills, routines — into your own account. Your copy is independent: the creator never sees your accounts or conversations.

${legend}

## Contents

- [⭐ Official marketplace](#-official-marketplace) (${official.length})
${CATEGORIES.map(([k, name]) => `- [${name}](#${anchor(name)}) (${fmt(counts[k])})`).join("\n")}
- [Submit a bot](#submit-a-bot)
- [Data & sources](#data--sources)

## ⭐ Official marketplace

Bots featured in xAI's own [Grok Bot Marketplace](https://x.ai/bot/marketplace).

${official.slice(0, 30).map(line).join("\n")}

${official.length > 30 ? `→ [All ${official.length} official bots on BotsDots](${SITE}/official)\n` : ""}
`;

await fs.mkdir("categories", { recursive: true });
for (const [k, name, blurb] of CATEGORIES) {
  const list = all.filter((t) => t.category === k).sort(byScore);
  readme += `## ${name}\n\n${blurb}\n\n${list.slice(0, TOP).map(line).join("\n")}\n\n→ **[All ${fmt(list.length)} ${name.toLowerCase()} templates](categories/${k}.md)** · [browse on BotsDots](${SITE}/category/${k})\n\n`;
  await fs.writeFile(
    `categories/${k}.md`,
    `# ${name} — Grok Bot templates (${fmt(list.length)})\n\n${blurb} Sorted by popularity. [← Back to the list](../README.md) · [Search & filter on BotsDots](${SITE}/category/${k})\n\n${legend}\n\n${list.map(line).join("\n")}\n`,
  );
}

readme += `## Submit a bot

Built a Grok bot worth sharing? **[Submit it on BotsDots](${SITE}/submit)** — the link is checked automatically and, once reviewed, it appears on the site and in this list on the next daily update.

Found a broken link or wrong info? Open an [issue](../../issues), or use "Report a problem" on the bot's BotsDots page.

## Data & sources

- [\`catalog.json\`](catalog.json) has every template with category, schedule, access, integrations, creator and source attribution. It's free to reuse; see [LICENSE](LICENSE).
- The list is rebuilt daily from [botsdots.site/catalog.json](${SITE}/catalog.json), which merges and de-duplicates the open community catalogs below. Every share link is checked against x.ai, and dead links are dropped.
- Upstream catalogs, credited with thanks: [kydlikebtc/awesome-grokbot](https://github.com/kydlikebtc/awesome-grokbot) · [majiayu000/awesome-grok-bot](https://github.com/majiayu000/awesome-grok-bot) · [cs68614-hash/awesome-grokbot-templates](https://github.com/cs68614-hash/awesome-grokbot-templates) · [GrokBot.dev](https://github.com/ZeroPointRepo/GrokBotDev) (CC BY 4.0) · [GrokBot HQ](https://grokbothq.xyz) (CC BY 4.0) · [dajiaohuang/awesome-grok-bot-templates](https://github.com/dajiaohuang/awesome-grok-bot-templates).
- Each bot belongs to its creator. This list only links to public share pages.

Independent project, not affiliated with xAI. Maintained by [@maimuzzamil](https://x.com/maimuzzamil) · [BotsDots](${SITE}).
`;

await fs.writeFile("README.md", readme);
await fs.writeFile("catalog.json", JSON.stringify({ source: SOURCE, generated: data.generated, count: all.length, templates: all }, null, 1));
console.log(`Built list: ${all.length} templates, ${official.length} official, README ${(Buffer.byteLength(readme) / 1024).toFixed(0)} KB`);
