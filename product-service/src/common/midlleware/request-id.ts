import { v4 as uuid } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export function RequestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || uuid();
  req['requestId'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  console.log(`[Middleware] Assigned requestId: ${requestId}`);
  next();
}