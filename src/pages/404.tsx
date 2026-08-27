import Head from 'next/head';
import NextLink from 'next/link';

import Header from '../components/sections/Header';
import Footer from '../components/sections/Footer';
import { allContent } from '../utils/local-content';

export default function NotFoundPage({ site }) {
    return (
        <div className="not-found-page">
            <Head>
                <title>Page Not Found | Eirik Nordgaard</title>
                <meta name="robots" content="noindex, follow" />
                <meta name="description" content="The requested page could not be found. Explore FINOP services and resources from Eirik Nordgaard." />
            </Head>
            {site.header && <Header {...site.header} enableAnnotations={false} />}
            <main id="main" className="not-found-main">
                <div className="not-found-content">
                    <p className="not-found-code">404</p>
                    <h1>That page is not available.</h1>
                    <p>The link may be outdated or the page may have moved. Continue to the main site or explore FINOP resources.</p>
                    <div className="not-found-actions">
                        <NextLink href="/" className="not-found-primary">
                            Return home
                        </NextLink>
                        <NextLink href="/fractional-finop/" className="not-found-secondary">
                            Explore FINOP services
                        </NextLink>
                    </div>
                </div>
            </main>
            {site.footer && <Footer {...site.footer} enableAnnotations={false} />}
        </div>
    );
}

export function getStaticProps() {
    const data = allContent();
    return { props: { site: data.props.site } };
}
