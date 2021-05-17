import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.useWebSocketAdapter(new IoAdapter(app));

	const PORT = process.env.PORT;

	await app.listen(PORT || 3000);
}
bootstrap();
