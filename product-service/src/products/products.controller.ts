import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  //create product
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  //get all
  @Get()
  getAll() {
    return this.productsService.getAll();
  }

  //get by id
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  //update product
  @Post(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, dto);
  }

  //delete product
  @Post(':id/delete')
  delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
