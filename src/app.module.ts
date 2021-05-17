import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SignalizationModule } from './signalization/signalization.module';

@Module({
	imports: [SignalizationModule],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
