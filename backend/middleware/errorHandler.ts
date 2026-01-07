import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Global error handler middleware
 * Catches all errors and returns appropriate responses
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    console.error('Error caught by global handler:', err);

    // Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.issues.map((e: any) => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }

    // Database errors (Postgres codes are always 5 characters)
    if (err.code && typeof err.code === 'string' && err.code.length === 5) {
        // PostgreSQL error codes
        switch (err.code) {
            case '23505': // unique_violation
                return res.status(409).json({
                    error: 'Duplicate entry',
                    detail: err.detail || 'A record with this value already exists'
                });

            case '23503': // foreign_key_violation
                return res.status(400).json({
                    error: 'Invalid reference',
                    detail: err.detail || 'Referenced record does not exist'
                });

            case '23502': // not_null_violation
                return res.status(400).json({
                    error: 'Missing required field',
                    detail: err.detail || 'A required field is missing'
                });

            case '22P02': // invalid_text_representation
                return res.status(400).json({
                    error: 'Invalid data format',
                    detail: 'The provided data format is invalid'
                });

            default:
                console.error('Database error:', err.code, err.detail);
                return res.status(500).json({
                    error: 'Database error',
                    detail: process.env.NODE_ENV === 'development' ? err.detail : 'An error occurred'
                });
        }
    }

    // HTTP errors with status code
    if (err.status || err.statusCode) {
        return res.status(err.status || err.statusCode).json({
            error: err.message || 'Request failed'
        });
    }

    // Generic errors
    return res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
}

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors automatically
 */
export function asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Not found handler
 * Returns 404 for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({
        error: 'Not found',
        path: req.path
    });
}
