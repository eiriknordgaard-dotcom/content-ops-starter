export function resolveStaticPaths({ pages }) {
    return pages
        .filter((page) => process.env.stackbitPreview || !page.isDraft)
        .map((page) => page.__metadata?.urlPath);
}
