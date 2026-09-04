import * as React from 'react';

import { trackEvent } from '../../../utils/analytics';

const DOWNLOAD_URL = '/downloads/finop-audit-readiness-checklist.pdf';

export default function ResourceDownload() {
    function handleDownload() {
        trackEvent('resource_download', {
            resource: 'finop_audit_readiness_checklist',
            file_name: 'finop-audit-readiness-checklist.pdf'
        });
    }

    return (
        <section id="download-checklist" className="resource-download-wrap" aria-labelledby="resource-download-title">
            <div className="resource-download">
                <div className="resource-download-copy">
                    <span className="resource-download-kicker">Free PDF resource</span>
                    <h2 id="resource-download-title">Download the Printable Checklist</h2>
                    <p>Save or print the complete six-page FINOP and audit readiness checklist. No email required.</p>
                </div>

                <a
                    className="resource-download-button"
                    href={DOWNLOAD_URL}
                    download="finop-audit-readiness-checklist.pdf"
                    onClick={handleDownload}
                >
                    Download the Checklist
                </a>
            </div>
        </section>
    );
}
