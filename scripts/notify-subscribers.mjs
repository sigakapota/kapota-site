#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getPosts, SITE } from "./lib/posts.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const WORKER_URL = process.env.NEWSLETTER_WORKER_URL;
const ADMIN_SECRET = process.env.NEWSLETTER_ADMIN_SECRET;

if (!WORKER_URL || !ADMIN_SECRET) {
  console.error("Faltam NEWSLETTER_WORKER_URL / NEWSLETTER_ADMIN_SECRET no ambiente.");
  process.exit(1);
}

const posts = getPosts(ROOT);

let failureCount = 0;

for (const post of posts) {
  try {
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
    if (!res.ok) {
      failureCount++;
      console.error(`${post.slug}: Falha ao notificar: ${res.status} ${JSON.stringify(data)}`);
    } else {
      console.log(`${post.slug}: ${res.status} ${JSON.stringify(data)}`);
    }
  } catch (error) {
    failureCount++;
    console.error(`${post.slug}: Erro ao notificar: ${error.message}`);
  }
}

if (failureCount > 0) {
  process.exit(1);
}
