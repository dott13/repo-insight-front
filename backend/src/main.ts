import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { SupabaseAuthGuard } from './auth/auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
    'http://localhost:1420',      // Tauri local development environment
    'tauri://localhost',          // Tauri production environment (Linux & Windows)
    'https://tauri.localhost',    // Tauri production environment (macOS)
  ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  const configService = app.get(ConfigService);
  app.useGlobalGuards(new SupabaseAuthGuard(configService));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

