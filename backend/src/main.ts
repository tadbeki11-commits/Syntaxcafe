import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import * as dotenv from "dotenv";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-App-Client",
      "Accept",
      "X-User-Id",
      "X-Branch-Id",
      "X-Business-Id",
      "X-Device-Token",
    ],
  });
  app.setGlobalPrefix("api");

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Cafe API")
    .setDescription("API documentation for the Café Management System")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`🚀 Server listening on http://localhost:${port}`);
}

bootstrap();
