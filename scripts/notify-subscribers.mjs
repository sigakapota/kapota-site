#!/usr/bin/env node
import { getPosts, SITE } from "./lib/posts.mjs";

const WORKER_URL = process.env.NEWSLETTER_WORKER_URL;
const ADMIN_SECRET = process.env.NEWSLETTER_ADMIN_SECRET;

if (!WORKER_URL || !ADMIN_SECRET) {
  console.error("Faltam NEWSLETTER_WORKER_URL / NEWSLETTER_ADMIN_SECRET no ambiente.");
  process.exit(1);
}

const posts = getPosts(process.cwd());

for (const post of posts) {
  const res = await fetch(`${WORKER_URL}/admin/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_SECRET}`,
    },
    body: JSON.stringify({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      url: `${SITE}/blog/${post.slug}/`,
    }),
  });
  const data = await res.json();
  console.log(`${post.slug}: ${res.status} ${JSON.stringify(data)}`);
}
