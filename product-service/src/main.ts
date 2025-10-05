import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filter/exceptions.filter';
import { RequestIdMiddleware } from './common/midlleware/request-id';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(RequestIdMiddleware);

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true,
  }));

  app.useGlobalFilters(new AllExceptionsFilter());
  
  await app.listen(process.env.APP_PORT || 3000);
  console.log(`🚀 Product Service running on port ${process.env.APP_PORT || 3000}`);
}
bootstrap();
