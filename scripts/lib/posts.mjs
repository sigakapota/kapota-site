import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

export const SITE = "https://kapota.com.br";

function unescapeAttr(s) {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

function extract(html, regex, label, slug) {
  const m = html.match(regex);
  if (!m) throw new Error(`${label} não encontrado em blog/${slug}/index.html`);
  return m[1];
}

export function getPosts(root) {
  const blogDir = join(root, "blog");
  const slugs = readdirSync(blogDir)
    .filter((name) => {
      const full = join(blogDir, name);
      return statSync(full).isDirectory() && existsSync(join(full, "index.html"));
    })
    .sort();

  const posts = slugs.map((slug) => {
    const html = readFileSync(join(blogDir, slug, "index.html"), "utf8");
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
  return posts;
}
