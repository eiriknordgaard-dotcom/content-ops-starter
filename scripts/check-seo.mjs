import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import frontMatter from 'front-matter';

const projectRoot = process.cwd();
const contentRoot = path.join(projectRoot, 'content/pages');
const excludedPrefixes = ['/blog/'];
const excludedPaths = new Set(['/careers/', '/pricing/', '/blog/']);
const errors = [];

function normalizePath(slug) {
    if (!slug || slug === '/') return '/';
    const withLeadingSlash = slug.startsWith('/') ? slug : `/${slug}`;
    return `${withLeadingSlash.replace(/\/$/, '')}/`;
}

function visit(value, visitor) {
    if (Array.isArray(value)) return value.forEach((item) => visit(item, visitor));
    if (!value || typeof value !== 'object') return;
    visitor(value);
    Object.values(value).forEach((item) => visit(item, visitor));
}

const pages = globSync('**/*.md', { cwd: contentRoot, absolute: true }).map((filePath) => {
    const attributes = frontMatter(fs.readFileSync(filePath, 'utf8')).attributes;
    return { filePath, attributes, pagePath: normalizePath(attributes.slug) };
});

const indexablePages = pages.filter(({ attributes, pagePath }) =>
    attributes.type === 'PageLayout' &&
    attributes.isDraft !== true &&
    !excludedPaths.has(pagePath) &&
    !excludedPrefixes.some((prefix) => pagePath.startsWith(prefix))
);

const knownPaths = new Set(indexablePages.map(({ pagePath }) => pagePath));
const seenTitles = new Map();

for (const { filePath, attributes } of indexablePages) {
    const relativePath = path.relative(projectRoot, filePath);
    const seo = attributes.seo || {};
    const title = seo.metaTitle || attributes.title;
    const description = seo.metaDescription || '';

    if (!title) errors.push(`${relativePath}: missing SEO title`);
    if (title && (title.length < 20 || title.length > 65)) errors.push(`${relativePath}: SEO title should be 20-65 characters (${title.length})`);
    if (!description) errors.push(`${relativePath}: missing meta description`);
    if (description && (description.length < 70 || description.length > 170)) {
        errors.push(`${relativePath}: meta description should be 70-170 characters (${description.length})`);
    }
    if (!seo.socialImage) errors.push(`${relativePath}: missing social image`);
    if (!attributes.dateModified) errors.push(`${relativePath}: missing dateModified`);

    if (seenTitles.has(title)) errors.push(`${relativePath}: duplicate SEO title also used by ${seenTitles.get(title)}`);
    seenTitles.set(title, relativePath);

    visit(attributes, (object) => {
        if (typeof object.url !== 'string') return;
        const url = object.url;
        if (url.startsWith('/images/') || url.startsWith('/downloads/')) {
            const assetPath = path.join(projectRoot, 'public', url);
            if (!fs.existsSync(assetPath)) errors.push(`${relativePath}: missing referenced asset ${url}`);
            return;
        }
        if (!url.startsWith('/') || url.startsWith('//')) return;
        const target = normalizePath(url.split('#')[0].split('?')[0]);
        if (target !== '/' && !knownPaths.has(target)) errors.push(`${relativePath}: internal link points to missing page ${url}`);
    });
}

const sitemap = fs.readFileSync(path.join(projectRoot, 'public/sitemap.xml'), 'utf8');
for (const { pagePath } of indexablePages) {
    const canonical = new URL(pagePath, 'https://eiriknordgaard.com').toString();
    if (!sitemap.includes(`<loc>${canonical}</loc>`)) errors.push(`sitemap.xml is missing ${canonical}`);
}

if (errors.length) {
    console.error(`SEO verification failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    process.exit(1);
}

console.log(`SEO verification passed for ${indexablePages.length} indexable pages.`);
