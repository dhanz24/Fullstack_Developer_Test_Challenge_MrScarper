import { RedisService } from './redis.service';
import { createClient } from 'redis';

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockClient);

    service = new RedisService();
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
  });

  describe('onModuleInit', () => {
    it('should create and connect Redis client', async () => {
      await service.onModuleInit();

      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
      });
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should call client.get with correct key', async () => {
      mockClient.get.mockResolvedValue('test-value');

      // Simulasi client sudah tersambung
      await service.onModuleInit();

      const result = await service.get('test-key');
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });
  });

  describe('set', () => {
    it('should call client.set with correct key, value, and ttl', async () => {
      mockClient.set.mockResolvedValue('OK');
      await service.onModuleInit();

      await service.set('test-key', 'test-value', 120);
      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value', { EX: 120 });
    });

    it('should use default ttl (60) when not provided', async () => {
      mockClient.set.mockResolvedValue('OK');
      await service.onModuleInit();

      await service.set('test-key', 'test-value');
      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value', { EX: 60 });
    });
  });
});
