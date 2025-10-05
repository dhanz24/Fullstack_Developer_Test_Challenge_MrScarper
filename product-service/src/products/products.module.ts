import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entity/products.entity';
import { RedisService } from '../redis/redis.service';
import { RabbitMQService } from '../rabbit-mq/rabbit-mq.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService, RedisService, RabbitMQService],
  exports: [ProductsService],
})
export class ProductsModule {}
