export function resolveStaticProps(urlPath, data) {
    const { __metadata, ...rest } = data.pages.find((page) => page.__metadata.urlPath === urlPath);
    return {
        page: {
            __metadata: {
                ...__metadata,
                urlPath
            },
            ...rest
        },
        ...data.props
    };
}
