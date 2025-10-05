import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      getAll: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- CREATE ---
  it('should call service.create with dto and return result', async () => {
    const dto: CreateProductDto = { name: 'Item', price: 100, qty: 5 };
    const expected = { id: '1', ...dto };
    service.create.mockResolvedValue(expected as any);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  // --- GET ALL ---
  it('should call service.getAll and return all products', async () => {
    const products = [{ id: '1' }, { id: '2' }];
    service.getAll.mockResolvedValue(products as any);

    const result = await controller.getAll();

    expect(service.getAll).toHaveBeenCalled();
    expect(result).toEqual(products);
  });

  // --- GET BY ID ---
  it('should call service.getById with correct id', async () => {
    const product = { id: '123', name: 'Test' };
    service.getById.mockResolvedValue(product as any);

    const result = await controller.getById('123');

    expect(service.getById).toHaveBeenCalledWith('123');
    expect(result).toEqual(product);
  });

  // --- UPDATE ---
  it('should call service.update with id and dto', async () => {
    const dto = { name: 'Updated' };
    const updated = { id: '1', name: 'Updated' };
    service.update.mockResolvedValue(updated as any);

    const result = await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual(updated);
  });

  // --- DELETE ---
  it('should call service.delete with correct id', async () => {
    service.delete.mockResolvedValue(undefined);

    const result = await controller.delete('1');

    expect(service.delete).toHaveBeenCalledWith('1');
    expect(result).toBeUndefined();
  });
});
