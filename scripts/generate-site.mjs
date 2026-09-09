#!/usr/bin/env node
// Lê cada blog/<slug>/index.html e regenera, a partir dos dados dos
// próprios artigos: sitemap.xml, a lista de posts em blog/index.html
// (entre os marcadores POSTS:START/POSTS:END) e os 3 destaques da home
// em index.html (entre os marcadores LATEST:START/LATEST:END).
//
// Uso: node scripts/generate-site.mjs

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "blog");
const SITE = "https://kapota.com.br";

function unescapeAttr(s) {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

function extract(html, regex, label, slug) {
  const m = html.match(regex);
  if (!m) throw new Error(`${label} não encontrado em blog/${slug}/index.html`);
  return m[1];
}

const slugs = readdirSync(BLOG_DIR)
  .filter((name) => {
    const full = join(BLOG_DIR, name);
    return statSync(full).isDirectory() && existsSync(join(full, "index.html"));
  })
  .sort();

const posts = slugs.map((slug) => {
  const html = readFileSync(join(BLOG_DIR, slug, "index.html"), "utf8");
  const category = unescapeAttr(extract(html, /<span class="cat">([^<]+)<\/span>/, "categoria", slug));
  const dateDisplay = unescapeAttr(
    extract(html, /<span class="cat">[^<]+<\/span>\s*<span>([^<]+)<\/span>/, "data exibida", slug)
  );
  const dateISO = extract(html, /"datePublished":\s*"([0-9-]+)"/, "datePublished", slug);
  const title = unescapeAttr(extract(html, /<h1>([^]*?)<\/h1>/, "título", slug)).trim();
  const excerptMatch =
    html.match(/<meta name="blog-excerpt" content="([^"]*)">/) ||
    html.match(/<meta name="description" content="([^"]*)">/);
  if (!excerptMatch) throw new Error(`excerpt não encontrado em blog/${slug}/index.html`);
  const excerpt = unescapeAttr(excerptMatch[1]);
  return { slug, category, dateDisplay, dateISO, title, excerpt };
});

posts.sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0));

// ---------- sitemap.xml ----------
const urls = [
  { loc: `${SITE}/`, priority: "1.0" },
  { loc: `${SITE}/blog/`, priority: "0.9" },
  ...[...posts].sort((a, b) => a.slug.localeCompare(b.slug)).map((p) => ({ loc: `${SITE}/blog/${p.slug}/`, priority: "0.7" })),
];
const sitemapBody = urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join("\n");
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapBody}\n</urlset>\n`;
writeFileSync(join(ROOT, "sitemap.xml"), sitemapXml);

// ---------- blog/index.html (lista completa, mais recente primeiro) ----------
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const postCards = posts
  .map(
    (p) => `    <a class="post-card" href="${p.slug}/">
      <div class="meta"><span>${esc(p.category)}</span><span class="date">${esc(p.dateDisplay)}</span></div>
      <h2>${esc(p.title)}</h2>
      <p class="excerpt">${esc(p.excerpt)}</p>
      <span class="read">Ler artigo &rarr;</span>
    </a>`
  )
  .join("\n\n");

replaceBetweenMarkers(
  join(BLOG_DIR, "index.html"),
  "<!-- POSTS:START (gerado por scripts/generate-site.mjs — não editar à mão) -->",
  "<!-- POSTS:END -->",
  postCards
);

// ---------- index.html (3 destaques mais recentes) ----------
const latestCards = posts
  .slice(0, 3)
  .map(
    (p) => `        <a class="latest-card" href="blog/${p.slug}/">
          <span class="cat">${esc(p.category)}</span>
          <h3>${esc(p.title)}</h3>
          <span class="date">${esc(p.dateDisplay)}</span>
        </a>`
  )
  .join("\n");

replaceBetweenMarkers(
  join(ROOT, "index.html"),
  "<!-- LATEST:START (gerado por scripts/generate-site.mjs — não editar à mão) -->",
  "<!-- LATEST:END -->",
  latestCards
);

function replaceBetweenMarkers(file, start, end, content) {
  const html = readFileSync(file, "utf8");
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Marcadores não encontrados em ${file}`);
  }
  const before = html.slice(0, startIdx + start.length);
  const after = html.slice(endIdx);
  writeFileSync(file, `${before}\n${content}\n    ${after}`);
}

console.log(`sitemap.xml, blog/index.html e index.html atualizados com ${posts.length} artigos.`);
