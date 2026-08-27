const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        window.clearTimeout(timeout);
    }
}

export function isAbortError(error: unknown) {
    return error instanceof DOMException && error.name === 'AbortError';
}
