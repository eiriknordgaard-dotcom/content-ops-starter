import * as React from 'react';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, buildIndexName } from '../../../utils/indexer/consts';
import algoliasearch from 'algoliasearch';
import { getAlgoliaResults } from '@algolia/autocomplete-js';
import '@algolia/autocomplete-theme-classic';
import BaseAutoComplete from './BaseAutoComplete';
import { trackEvent } from '../../../utils/analytics';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY);

export default function AutoCompletePosts() {
    const trackedSearches = React.useRef(new Set());

    function trackSearch(term) {
        const normalized = term?.trim();
        if (!normalized || trackedSearches.current.has(normalized)) return;
        trackedSearches.current.add(normalized);
        trackEvent('search', { search_term: normalized });
    }

    return (
        <BaseAutoComplete
            openOnFocus={true}
            placeholder="Search in posts..."
            getSources={({ query }) => [
                {
                    sourceId: 'posts',
                    getItems() {
                        return getAlgoliaResults({
                            searchClient,
                            queries: [
                                {
                                    indexName: buildIndexName(),
                                    query
                                }
                            ]
                        });
                    },
                    templates: {
                        item({ item, components }) {
                            return <ResultItem hit={item} components={components} />;
                        }
                    },
                    getItemUrl({ item }) {
                        return item.url;
                    }
                }
            ]}
            onSubmit={({ state }) => {
                trackSearch(state.query);
            }}
            onSelect={({ item, state }) => {
                trackSearch(state.query);
                trackEvent('select_content', {
                    content_type: 'search_result',
                    item_id: String(item.objectID || item.url),
                    search_term: state.query?.trim() || ''
                });
                if (item.url) {
                    window.location.href = item.url;
                }
            }}
        />
    );
}

export function ResultItem({ hit, components }) {
    return (
        <a href={hit.url} className="aa-ItemLink" tabIndex="0">
            <div className="aa-ItemContent">
                <div className="aa-ItemTitle">
                    <components.Highlight hit={hit} attribute="title" />
                </div>
            </div>
        </a>
    );
}
