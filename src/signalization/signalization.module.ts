import { Module } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';

import { LoggerModule } from 'src/logger/logger.module';
import { SignalizationGateway } from './signalization.gateway';
import { RTCPeerConnection } from 'wrtc';
import { RTCPEERCONNECTION } from 'src/tokens';
import { SignalizationService } from './signalization.service';
import { RoomService } from './room/room.service';
import { UserService } from './user/user.service';
import { User } from './user/user';
import { Room } from './room/room';

const peerConnectionFactory = {
	provide: RTCPEERCONNECTION,
	useFactory: () => RTCPeerConnection,
};

@Module({
	imports: [
		LoggerModule,
		TypegooseModule.forFeature([
			{
				typegooseClass: User,
				schemaOptions: {
					timestamps: true,
					collection: 'users',
				},
			},
		]),
		TypegooseModule.forFeature([
			{
				typegooseClass: Room,
				schemaOptions: {
					timestamps: true,
					collection: 'rooms',
				},
			},
		]),
	],
	providers: [
		SignalizationGateway,
		peerConnectionFactory,
		SignalizationService,
		RoomService,
		UserService,
	],
})
export class SignalizationModule {}
