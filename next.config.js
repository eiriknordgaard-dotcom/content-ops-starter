/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
    output: 'export',
    poweredByHeader: false,
    env: {
        stackbitPreview: process.env.STACKBIT_PREVIEW
    },
    trailingSlash: true,
    reactStrictMode: true,
    images: {
        unoptimized: true
    }
};

module.exports = nextConfig;
