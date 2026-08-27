import * as React from 'react';

export default function BrokerCheck({ className, ...props }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            data-sb-field-path={props['data-sb-field-path']}
        >
            <path
                d="M12 2.75 19 5.6v5.62c0 4.57-2.8 8.04-7 10.03-4.2-1.99-7-5.46-7-10.03V5.6L12 2.75Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path d="m8.5 11.9 2.15 2.15 4.85-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
