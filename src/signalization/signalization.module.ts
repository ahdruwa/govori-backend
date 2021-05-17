import { Module } from '@nestjs/common';

import { LoggerModule } from 'src/logger/logger.module';
import { SignalizationGateway } from './signalization.gateway';

@Module({
	imports: [LoggerModule],
	providers: [SignalizationGateway],
})
export class SignalizationModule {}
