import { RabbitMQService } from './rabbit-mq.service';
import * as amqp from 'amqplib';

jest.mock('amqplib');

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let mockChannel: any;
  let mockConnection: any;

  beforeEach(async () => {
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(true),
      publish: jest.fn(),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
      bindQueue: jest.fn().mockResolvedValue(true),
      consume: jest.fn(),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
    };

    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    service = new RabbitMQService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- CONNECT ---
  it('should connect to RabbitMQ and set isReady to true', async () => {
    await service['connect']();

    expect(amqp.connect).toHaveBeenCalledWith(expect.stringContaining('RABBITMQ_URL'));
    expect(mockConnection.createChannel).toHaveBeenCalled();
    expect(mockChannel.assertExchange).toHaveBeenCalledWith('events', 'topic', { durable: true });
    expect((service as any).isReady).toBe(true);
  });

  it('should retry connection if first attempt fails', async () => {
    (amqp.connect as jest.Mock)
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce(mockConnection);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await service['connect'](2, 10);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔄 Retrying in'));
    expect(mockConnection.createChannel).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // --- WAIT FOR READY ---
  it('should wait until isReady is true', async () => {
    const spy = jest.spyOn(global, 'setTimeout');

    const waitPromise = service['waitForReady']();
    (service as any).isReady = true;

    await waitPromise;
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // --- PUBLISH ---
  it('should publish event after ready', async () => {
    (service as any).isReady = true;
    (service as any).channel = mockChannel;

    await service.publish('order.created', { id: 1 });

    expect(mockChannel.publish).toHaveBeenCalledWith(
      'events',
      'order.created',
      expect.any(Buffer)
    );
  });

  // --- SUBSCRIBE ---
  it('should subscribe to event and call handler when message received', async () => {
    (service as any).isReady = true;
    (service as any).channel = mockChannel;

    const handler = jest.fn();
    await service.subscribe('order.created', handler);

    expect(mockChannel.assertQueue).toHaveBeenCalled();
    expect(mockChannel.bindQueue).toHaveBeenCalledWith('test-queue', 'events', 'order.created');
    expect(mockChannel.consume).toHaveBeenCalled();

    // Simulasikan pesan diterima
    const consumeCall = mockChannel.consume.mock.calls[0];
    const consumeHandler = consumeCall[1];
    const mockMsg = {
      content: Buffer.from(JSON.stringify({ id: 123 })),
    };
    consumeHandler(mockMsg);

    expect(handler).toHaveBeenCalledWith({ id: 123 });
  });
});
