import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { SocketParameterValidationExceptionFilter } from './events/exceptionFilter';
import * as path from 'path';
import * as express from 'express';
import * as serveStatic from 'serve-static';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new SocketParameterValidationExceptionFilter());
  app.enableCors({
    origin: 'http://localhost:3001',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });
  const uploadsPath = path.resolve(__dirname, 'uploads');
  app.use('/uploads', express.static(uploadsPath));
  await app.listen(3000);
}
bootstrap();
