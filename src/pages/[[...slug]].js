import React from 'react';
import Head from 'next/head';
import { allContent } from '../utils/local-content';
import { getComponent } from '../components/components-registry';
import { resolveStaticProps } from '../utils/static-props-resolvers';
import { resolveStaticPaths } from '../utils/static-paths-resolvers';
import { seoGenerateTitle, seoGenerateMetaTags, seoGenerateMetaDescription, seoGenerateCanonicalUrl, seoGenerateOgImage } from '../utils/seo-utils';

function Page(props) {
    const { page, site, shouldNoIndex } = props;
    const { modelName } = page.__metadata;
    if (!modelName) {
        throw new Error(`page has no type, page '${props.path}'`);
    }
    const PageLayout = getComponent(modelName);
    if (!PageLayout) {
        throw new Error(`no page layout matching the page model: ${modelName}`);
    }
    const title = seoGenerateTitle(page, site);
    const metaTags = seoGenerateMetaTags(page, site);
    const metaDescription = seoGenerateMetaDescription(page, site);
    const canonicalUrl = seoGenerateCanonicalUrl(page, site);
    const socialImage = seoGenerateOgImage(page, site);
    const structuredData = generateStructuredData(page, site, canonicalUrl, metaDescription, socialImage);
    const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
    return (
        <>
            <Head>
                <title>{title}</title>
                {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
                {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
                {metaDescription && <meta name="description" content={metaDescription} />}
                {socialImage?.endsWith('/images/finop-social-card-v2.png') && <meta property="og:image:width" content="1200" />}
                {socialImage?.endsWith('/images/finop-social-card-v2.png') && <meta property="og:image:height" content="630" />}
                {socialImage?.endsWith('/images/finop-social-card-v2.png') && <meta property="og:image:type" content="image/png" />}
                {socialImage && <meta property="og:image:alt" content={`${page.title} | Eirik Nordgaard`} />}
                {shouldNoIndex && <meta name="robots" content="noindex, nofollow" />}
                {googleSiteVerification && <meta name="google-site-verification" content={googleSiteVerification} />}
                {metaTags.map((metaTag) => {
                    if (metaTag.format === 'property') {
                        // OpenGraph meta tags (og:*) should be have the format <meta property="og:…" content="…">
                        return <meta key={metaTag.property} property={metaTag.property} content={metaTag.content} />;
                    }
                    return <meta key={metaTag.property} name={metaTag.property} content={metaTag.content} />;
                })}
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                {site.favicon && <link rel="icon" href={site.favicon} />}
                {structuredData.map((data, index) => (
                    <script
                        key={`structured-data-${index}`}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
                    />
                ))}
            </Head>
            <PageLayout page={page} site={site} />
        </>
    );
}

function generateStructuredData(page, site, canonicalUrl, metaDescription, socialImage) {
    const graph = [];
    const rootUrl = site.siteUrl.replace(/\/$/, '');
    const personId = `${rootUrl}/#person`;
    const businessId = `${rootUrl}/#business`;
    const websiteId = `${rootUrl}/#website`;
    const webpageId = `${canonicalUrl}#webpage`;
    const pagePath = page.__metadata?.urlPath === '/' ? '/' : `${page.__metadata?.urlPath?.replace(/\/$/, '')}/`;
    const articlePages = [
        '/what-does-a-finop-do/',
        '/series-27-vs-series-28-finop/',
        '/outsourced-vs-in-house-finop/',
        '/finop-audit-readiness-checklist/'
    ];

    graph.push(
        {
            '@type': 'Person',
            '@id': personId,
            name: 'Eirik Nordgaard',
            url: rootUrl,
            image: `${rootUrl}/images/eirik-nordgaard-headshot.jpg`,
            jobTitle: 'FINOP and Regulatory Finance Consultant',
            sameAs: [
                'https://www.linkedin.com/in/eiriknordgaard',
                'https://brokercheck.finra.org/individual/summary/6882463',
                'https://cartanaconsulting.com/about-cartana/'
            ],
            knowsAbout: [
                'FINOP consulting',
                'Broker-dealer financial operations',
                'FINRA FOCUS reporting',
                'Net capital compliance',
                'Broker-dealer books and records',
                'Broker-dealer annual audits'
            ],
            hasCredential: ['FINRA Series 28', 'FINRA Series 24', 'FINRA Series 7', 'FINRA Series 63'].map((credential) => ({
                '@type': 'EducationalOccupationalCredential',
                credentialCategory: credential
            }))
        },
        {
            '@type': 'ProfessionalService',
            '@id': businessId,
            name: 'Eirik Nordgaard FINOP Consultant and Outsourced FINOP Services',
            url: rootUrl,
            image: socialImage,
            description: 'Outsourced FINOP consulting and Series 28 financial oversight for introducing broker-dealers.',
            areaServed: {
                '@type': 'Country',
                name: 'United States'
            },
            founder: { '@id': personId },
            employee: { '@id': personId },
            serviceType: 'FINOP consulting and outsourced FINOP services'
        },
        {
            '@type': 'WebSite',
            '@id': websiteId,
            url: rootUrl,
            name: 'Eirik Nordgaard',
            publisher: { '@id': businessId },
            inLanguage: 'en-US'
        },
        {
            '@type': 'WebPage',
            '@id': webpageId,
            url: canonicalUrl,
            name: page.title,
            description: metaDescription,
            isPartOf: { '@id': websiteId },
            about: { '@id': businessId },
            primaryImageOfPage: socialImage ? { '@type': 'ImageObject', url: socialImage } : undefined,
            inLanguage: 'en-US'
        }
    );

    if (pagePath === '/fractional-finop/') {
        graph.push({
            '@type': 'Service',
            '@id': `${canonicalUrl}#service`,
            name: 'Series 28 FINOP Consulting for Introducing Broker-Dealers',
            url: canonicalUrl,
            description: metaDescription,
            provider: { '@id': businessId },
            areaServed: {
                '@type': 'Country',
                name: 'United States'
            },
            serviceType: 'Series 28, fractional, and outsourced FINOP consulting'
        });
    }

    if (articlePages.includes(pagePath)) {
        graph.push({
            '@type': 'Article',
            '@id': `${canonicalUrl}#article`,
            headline: page.seo?.metaTitle || page.title,
            description: metaDescription,
            url: canonicalUrl,
            mainEntityOfPage: { '@id': webpageId },
            image: socialImage,
            datePublished: page.datePublished,
            dateModified: page.dateModified || page.datePublished,
            author: { '@id': personId },
            publisher: { '@id': businessId },
            inLanguage: 'en-US'
        });
    }

    if (pagePath !== '/') {
        graph.push({
            '@type': 'BreadcrumbList',
            '@id': `${canonicalUrl}#breadcrumb`,
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Home',
                    item: `${rootUrl}/`
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: page.title,
                    item: canonicalUrl
                }
            ]
        });
    }

    const faqItems = (page.sections || [])
        .filter((section) => section.__metadata?.modelName === 'FaqSection')
        .flatMap((section) => section.items || []);

    if (faqItems.length > 0) {
        graph.push({
            '@type': 'FAQPage',
            '@id': `${canonicalUrl}#faq`,
            isPartOf: { '@id': webpageId },
            mainEntity: faqItems.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.answer
                }
            }))
        });
    }

    return [
        {
            '@context': 'https://schema.org',
            '@graph': graph
        }
    ];
}

export function getStaticPaths() {
    const data = allContent();
    const paths = resolveStaticPaths(data);
    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const data = allContent();
    const urlPath = '/' + (params.slug || []).join('/');
    const props = await resolveStaticProps(urlPath, data);
    return {
        props: {
            ...props,
            shouldNoIndex: Boolean(process.env.CONTEXT && process.env.CONTEXT !== 'production')
        }
    };
}

export default Page;
