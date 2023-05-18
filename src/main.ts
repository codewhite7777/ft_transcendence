import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { SocketParameterValidationExceptionFilter } from './events/exceptionFilter';
import * as path from 'path';
import * as express from 'express';
import * as serveStatic from 'serve-static';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
	const configService = new ConfigService();
  app.use(cookieParser());
  app.useGlobalFilters(new SocketParameterValidationExceptionFilter());
  app.enableCors({
    // origin: 'http://localhost:3001',
    origin: `${configService.get<string>('FRONTEND_URL')}`,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  await app.listen(3000);
}
bootstrap();
