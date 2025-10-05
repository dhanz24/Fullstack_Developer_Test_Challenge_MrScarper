import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entity/products.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbit-mq/rabbit-mq.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    @InjectRepository(Product) private repo: Repository<Product>,
    private readonly redis: RedisService,
    private readonly rabbit: RabbitMQService,
  ) {}
  
  async onModuleInit() {
    // subscribe order.created
    await this.rabbit.subscribe('order.created', async (data) => {
        console.log('📥 Received order.created:', data);
        await this.reduceQty(data.productId, data.qty);
    });
 }


  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.repo.create(dto);
    const saved = await this.repo.save(product);

    // Emit event
    await this.rabbit.publish('product.created', saved);
    return saved;
  }

  async getAll(): Promise<Product[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async getById(id: string): Promise<Product> {
    const cached = await this.redis.get(`product:${id}`);
    if (cached) return JSON.parse(cached);

    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);

    await this.redis.set(`product:${id}`, JSON.stringify(product));
    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto>): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    
    if (!product) throw new NotFoundException();

    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async delete(id: string): Promise<void> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException();

    await this.repo.remove(product);
  }

  async reduceQty(productId: string, qty: number) {
    const product = await this.repo.findOne({ where: { id: productId } });
    if (!product) {
    this.logger.warn(`Product ${productId} not found`);
    return;
  }

  if (product.qty < qty) {
    this.logger.warn(`Insufficient stock for product ${product.id}`);
    return; // atau throw exception
  }

  product.qty -= qty;
  await this.repo.save(product);
  this.logger.log(`✅ Reduced stock for product ${product.id}. Remaining: ${product.qty}`);
}


}
