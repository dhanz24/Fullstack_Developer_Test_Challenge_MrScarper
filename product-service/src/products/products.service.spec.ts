import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { Repository } from 'typeorm';
import { Product } from './entity/products.entity';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbit-mq/rabbit-mq.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

// ✅ Mock Repository
const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

// ✅ Mock Redis
const mockRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
});

// ✅ Mock RabbitMQ
const mockRabbit = () => ({
  publish: jest.fn(),
  subscribe: jest.fn(),
});

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: jest.Mocked<Repository<Product>>;
  let redis: jest.Mocked<RedisService>;
  let rabbit: jest.Mocked<RabbitMQService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useFactory: mockRepo },
        { provide: RedisService, useFactory: mockRedis },
        { provide: RabbitMQService, useFactory: mockRabbit },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repo = module.get(getRepositoryToken(Product));
    redis = module.get(RedisService);
    rabbit = module.get(RabbitMQService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- CREATE ---
  it('should create and save a product', async () => {
    const dto = { name: 'Test', price: 100, qty: 5 };
    const product = { id: '1', ...dto };

    repo.create.mockReturnValue(product as Product);
    repo.save.mockResolvedValue(product as Product);

    const result = await service.create(dto as any);

    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(product);
    expect(rabbit.publish).toHaveBeenCalledWith('product.created', product);
    expect(result).toEqual(product);
  });

  // --- GET ALL ---
  it('should return all products', async () => {
    const mockProducts = [{ id: '1' }, { id: '2' }] as Product[];
    repo.find.mockResolvedValue(mockProducts);

    const result = await service.getAll();

    expect(repo.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    expect(result).toEqual(mockProducts);
  });

  // --- GET BY ID ---
  it('should return product from cache if exists', async () => {
    const cached = { id: '1', name: 'Cached' };
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.getById('1');
    expect(redis.get).toHaveBeenCalledWith('product:1');
    expect(result).toEqual(cached);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('should fetch product from DB if not in cache', async () => {
    const product = { id: '1', name: 'From DB' };
    redis.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(product as Product);

    const result = await service.getById('1');

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(redis.set).toHaveBeenCalledWith('product:1', JSON.stringify(product));
    expect(result).toEqual(product);
  });

  it('should throw NotFoundException if product not found', async () => {
    redis.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(null);

    await expect(service.getById('999')).rejects.toThrow(NotFoundException);
  });

  // --- UPDATE ---
  it('should update a product', async () => {
    const existing = { id: '1', name: 'Old' } as Product;
    const updated = { id: '1', name: 'New' } as Product;
    repo.findOne.mockResolvedValue(existing);
    repo.save.mockResolvedValue(updated);

    const result = await service.update('1', { name: 'New' });

    expect(repo.save).toHaveBeenCalledWith({ ...existing, name: 'New' });
    expect(result).toEqual(updated);
  });

  // --- DELETE ---
  it('should delete product', async () => {
    const existing = { id: '1' } as Product;
    repo.findOne.mockResolvedValue(existing);

    await service.delete('1');
    expect(repo.remove).toHaveBeenCalledWith(existing);
  });

  it('should throw NotFoundException when deleting non-existing product', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.delete('999')).rejects.toThrow(NotFoundException);
  });

  // --- REDUCE QTY ---
  it('should reduce quantity when stock is sufficient', async () => {
    const product = { id: '1', qty: 10 } as Product;
    repo.findOne.mockResolvedValue(product);
    repo.save.mockResolvedValue({ ...product, qty: 5 } as Product);

    await service.reduceQty('1', 5);

    expect(repo.save).toHaveBeenCalledWith({ ...product, qty: 5 });
  });

  it('should log warning when product not found', async () => {
    const spyWarn = jest.spyOn(service['logger'], 'warn');
    repo.findOne.mockResolvedValue(null);

    await service.reduceQty('99', 5);
    expect(spyWarn).toHaveBeenCalledWith('Product 99 not found');
  });

  it('should warn if insufficient stock', async () => {
    const spyWarn = jest.spyOn(service['logger'], 'warn');
    repo.findOne.mockResolvedValue({ id: '1', qty: 2 } as Product);

    await service.reduceQty('1', 5);
    expect(spyWarn).toHaveBeenCalledWith('Insufficient stock for product 1');
  });
});
