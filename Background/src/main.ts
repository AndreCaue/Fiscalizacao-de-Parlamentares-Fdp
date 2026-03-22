import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Prefix global da API
  app.setGlobalPrefix('api');

  // Swagger
  const config: any = new DocumentBuilder()
    .setTitle('PCD- Projeto Como vota Depuitado Brasil API')
    .setDescription(
      'API para visualização de votações de deputados brasileiros',
    )
    .setVersion('1.0')
    .addTag('deputados')
    .addTag('partidos')
    .addTag('votacoes')
    .addTag('votos')
    .addTag('integracao')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 PCD-Brasil Backend rodando em: http://localhost:${port}`);
  console.log(`📚 Documentação Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
