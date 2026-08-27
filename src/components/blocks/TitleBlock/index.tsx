import * as React from 'react';
import classNames from 'classnames';

import { mapStylesToClassNames as mapStyles } from '../../../utils/map-styles-to-class-names';

export default function TitleBlock(props) {
    const { className, text = [], color = 'text-dark', styles = {}, level = 2 } = props;
    const fieldPath = props['data-sb-field-path'];
    const TitleTag = level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2';
    if (!text) {
        return null;
    }

    return (
        <TitleTag
            className={classNames(
                'sb-component',
                'sb-component-block',
                'sb-component-title',
                color,
                className,
                styles?.self ? mapStyles(styles?.self) : undefined
            )}
            data-sb-field-path={fieldPath}
        >
            <span {...(fieldPath && { 'data-sb-field-path': '.text' })}>
                {typeof text === 'string' && text.includes('\n')
                    ? text.split('\n').map((part, i, arr) => (
                          <React.Fragment key={i}>
                              {part}
                              {i < arr.length - 1 && <br />}
                          </React.Fragment>
                      ))
                    : text}
            </span>
        </TitleTag>
    );
}
