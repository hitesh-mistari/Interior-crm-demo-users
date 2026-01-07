/**
 * Frontend API Error Handler
 * Gracefully handles errors from API calls
 */

export interface APIError {
    error: string;
    details?: any;
    detail?: string;
    message?: string;
}

/**
 * Parse error response from API
 */
export function parseAPIError(error: any): string {
    // Network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return 'Network error. Please check your connection and try again.';
    }

    // HTTP errors with JSON body
    if (error?.error) {
        if (typeof error.error === 'string') {
            return error.error;
        }
        if (error.details) {
            // Zod validation errors
            const fieldErrors = Array.isArray(error.details)
                ? error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
                : JSON.stringify(error.details);
            return `${error.error}: ${fieldErrors}`;
        }
        if (error.detail) {
            return `${error.error}: ${error.detail}`;
        }
    }

    // Generic error object
    if (error?.message) {
        return error.message;
    }

    // Fallback
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Wrapper for fetch calls with error handling
 */
export async function fetchWithErrorHandling(
    url: string,
    options?: RequestInit
): Promise<Response> {
    try {
        const response = await fetch(url, options);

        // Handle non-OK responses
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
                status: response.status,
                error: errorData.error || response.statusText,
                details: errorData.details,
                detail: errorData.detail
            };
        }

        return response;
    } catch (error) {
        // Re-throw with parsed message
        if (error instanceof TypeError) {
            throw error; // Network errors
        }
        throw error; // API errors
    }
}

/**
 * Helper to show user-friendly error messages
 */
export function showError(error: any): void {
    const message = parseAPIError(error);
    console.error('API Error:', error);
    alert(message); // You can replace this with toast notifications
}

/**
 * Retry failed requests
 */
export async function retryFetch(
    fn: () => Promise<any>,
    retries = 3,
    delay = 1000
): Promise<any> {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;

        console.log(`Retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryFetch(fn, retries - 1, delay * 2);
    }
}
