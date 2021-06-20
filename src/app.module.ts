import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SignalizationModule } from './signalization/signalization.module';

@Module({
	imports: [
		SignalizationModule,
		TypegooseModule.forRoot(process.env.DB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}),
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
