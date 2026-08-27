import { Html, Head, Main, NextScript } from 'next/document';

const themeScript = `
    (function () {
        try {
            var stored = localStorage.getItem('site-theme');
            var theme = stored === 'light' || stored === 'dark'
                ? stored
                : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.dataset.theme = theme;
            document.documentElement.style.colorScheme = theme;
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', theme === 'dark' ? '#101012' : '#FFFFFF');
        } catch (error) {
            document.documentElement.dataset.theme = 'light';
        }
    })();
`;

export default function Document() {
    return (
        <Html lang="en" suppressHydrationWarning>
            <Head>
                <meta name="theme-color" content="#FFFFFF" />
                <meta
                    name="google-site-verification"
                    content="5ZdU0v2SD4-x-SE5mL3ReLiVLp2grJrCwgilfr9OHqY"
                />
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
