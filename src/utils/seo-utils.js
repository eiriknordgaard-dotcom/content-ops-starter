export function seoGenerateMetaTags(page, site) {
    let pageMetaTags = {};

    if (site.defaultMetaTags?.length) {
        site.defaultMetaTags.forEach((metaTag) => {
            pageMetaTags[metaTag.property] = metaTag.content;
        });
    }

    const seoTitle = seoGenerateTitle(page, site);
    const ogImage = seoGenerateOgImage(page, site);

    pageMetaTags = {
        ...pageMetaTags,
        ...(seoTitle && { 'og:title': seoTitle }),
        ...(ogImage && { 'og:image': ogImage, 'twitter:image': ogImage })
    };

    if (page.seo?.metaTags?.length) {
        page.seo?.metaTags.forEach((metaTag) => {
            pageMetaTags[metaTag.property] = metaTag.content;
        });
    }

    let metaTags = [];
    Object.keys(pageMetaTags).forEach((key) => {
        if (pageMetaTags[key] !== null) {
            metaTags.push({
                property: key,
                content: pageMetaTags[key],
                format: key.startsWith('og') ? 'property' : 'name'
            });
        }
    });

    return metaTags;
}

export function seoGenerateTitle(page, site) {
    let title = page.seo?.metaTitle ? page.seo?.metaTitle : page.title;
    if (site.titleSuffix && page.seo?.addTitleSuffix !== false) {
        title = `${title} - ${site.titleSuffix}`;
    }
    return title;
}

export function seoGenerateMetaDescription(page, _site) {
    return page.seo?.metaDescription || null;
}

export function seoGenerateOgImage(page, site) {
    let ogImage = null;
    // Use the sites default og:image field
    if (site.defaultSocialImage) {
        ogImage = site.defaultSocialImage;
    }
    // page socialImage field overrides all others
    if (page.seo?.socialImage) {
        ogImage = page.seo?.socialImage;
    }

    if (ogImage) {
        return seoGenerateAbsoluteUrl(ogImage, site);
    }
    return null;
}

export function seoGenerateCanonicalUrl(page, site) {
    const rawPagePath = page.__metadata?.urlPath || page.slug || '/';
    const pagePath = rawPagePath === '/' ? '/' : `${rawPagePath.replace(/\/$/, '')}/`;
    return seoGenerateAbsoluteUrl(pagePath, site);
}

function seoGenerateAbsoluteUrl(pathOrUrl, site) {
    if (!pathOrUrl) {
        return null;
    }

    try {
        return new URL(pathOrUrl, site.siteUrl || process.env.URL).toString();
    } catch {
        return pathOrUrl;
    }
}
