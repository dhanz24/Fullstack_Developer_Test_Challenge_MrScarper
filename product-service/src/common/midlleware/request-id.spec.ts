import { Request, Response, NextFunction } from 'express';
import { RequestIdMiddleware } from './request-id';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('RequestIdMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('should assign new requestId if header not present', () => {
    RequestIdMiddleware(req as Request, res as Response, next);

    expect(req['requestId']).toBe('mock-uuid');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'mock-uuid');
    expect(next).toHaveBeenCalled();
  });

  it('should reuse existing requestId from header', () => {
    req.headers = { 'x-request-id': 'existing-id' };

    RequestIdMiddleware(req as Request, res as Response, next);

    expect(req['requestId']).toBe('existing-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-id');
  });

  it('should log the assigned requestId', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    RequestIdMiddleware(req as Request, res as Response, next);
    expect(logSpy).toHaveBeenCalledWith('[Middleware] Assigned requestId: mock-uuid');
    logSpy.mockRestore();
  });
});