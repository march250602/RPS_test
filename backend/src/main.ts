import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.Frontend,
  });

  await app.listen(process.env.PORT ?? 4000);
  console.log(`Server running on port ${process.env.PORT ?? 4000}`);
    console.log("Frontend Connected",process.env.Frontend);
}
bootstrap();
