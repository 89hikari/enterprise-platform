import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Fix BigInt JSON serialization (Prisma uses BigInt for Int64 fields)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.APP_URL || 'http://localhost',
    credentials: true,
  });

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

bootstrap();
