import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  // Other client errors raised by Express/body-parser (body too large,
  // unsupported charset, malformed URL, …). They mark themselves with a 4xx
  // status. Answer with a fixed message per status; never echo internals.
  const status = Number(err?.status ?? err?.statusCode);
  if (status >= 400 && status < 500) {
    const messages: Record<number, string> = {
      400: 'Bad request',
      404: 'Not found',
      413: 'Request body too large',
      415: 'Unsupported request encoding',
    };
    res.status(status).json({ error: messages[status] ?? 'Bad request' });
    return;
  }

  // Anything else is a bug: log the details server-side, return nothing specific.
  console.error('[server] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
};
