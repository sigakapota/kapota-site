#!/usr/bin/env node
// Regenera sitemap.xml a partir das pastas em blog/<slug>/index.html.
// Uso: node scripts/generate-sitemap.mjs

import { readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "blog");
const SITE = "https://kapota.com.br";

const slugs = readdirSync(BLOG_DIR)
  .filter((name) => {
    const full = join(BLOG_DIR, name);
    return statSync(full).isDirectory() && existsSync(join(full, "index.html"));
  })
  .sort();

const urls = [
  { loc: `${SITE}/`, priority: "1.0" },
  { loc: `${SITE}/blog/`, priority: "0.9" },
  ...slugs.map((slug) => ({ loc: `${SITE}/blog/${slug}/`, priority: "0.7" })),
];

const body = urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

writeFileSync(join(ROOT, "sitemap.xml"), xml);
console.log(`sitemap.xml atualizado com ${slugs.length} artigos.`);
