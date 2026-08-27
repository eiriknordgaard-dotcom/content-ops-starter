import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import frontMatter from 'front-matter';

const siteUrl = 'https://eiriknordgaard.com';
const pagesDirectory = path.resolve('content/pages');
const outputPath = path.resolve('public/sitemap.xml');
const excludedPaths = new Set(['/careers/', '/pricing/', '/blog/']);

function normalizePath(slug) {
    if (!slug || slug === '/') return '/';
    const withLeadingSlash = slug.startsWith('/') ? slug : `/${slug}`;
    return `${withLeadingSlash.replace(/\/$/, '')}/`;
}

function isIndexablePage(attributes) {
    const pagePath = normalizePath(attributes.slug);
    return (
        attributes.type === 'PageLayout' &&
        attributes.isDraft !== true &&
        !excludedPaths.has(pagePath) &&
        !pagePath.startsWith('/blog/')
    );
}

function xmlEscape(value) {
    return value.replace(/[<>&'"]/g, (character) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;'
    })[character]);
}

const pages = globSync('**/*.md', { cwd: pagesDirectory, absolute: true })
    .map((filePath) => {
        const parsed = frontMatter(fs.readFileSync(filePath, 'utf8'));
        const attributes = parsed.attributes;
        if (!isIndexablePage(attributes)) return null;

        const pagePath = normalizePath(attributes.slug);
        const fileModifiedDate = fs.statSync(filePath).mtime.toISOString().slice(0, 10);
        return {
            url: new URL(pagePath, siteUrl).toString(),
            lastModified: attributes.dateModified || attributes.datePublished || fileModifiedDate
        };
    })
    .filter(Boolean)
    .sort((a, b) => {
        if (a.url === `${siteUrl}/`) return -1;
        if (b.url === `${siteUrl}/`) return 1;
        return a.url.localeCompare(b.url);
    });

const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.flatMap(({ url, lastModified }) => [
        '    <url>',
        `        <loc>${xmlEscape(url)}</loc>`,
        `        <lastmod>${xmlEscape(lastModified)}</lastmod>`,
        '    </url>'
    ]),
    '</urlset>',
    ''
].join('\n');

fs.writeFileSync(outputPath, sitemap);
console.log(`Generated sitemap with ${pages.length} indexable pages.`);
