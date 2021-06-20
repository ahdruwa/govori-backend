import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { LoggerService } from 'src/logger/logger.service';
import { Server, Socket } from 'socket.io';
import { CallUserDTO } from './dto/call-user.dto';
import { IceCandidateDTO } from './dto/ice-candidate.dto';
import { ConnectRoomAcceptedDTO } from './dto/connect-room-accepted.dto';
import { ConnectRoomDTO } from './dto/connect-room.dto';
import { RTCSessionDescription, RTCPeerConnection, MediaStream } from 'wrtc';
import { Inject } from '@nestjs/common';
import { RTCPEERCONNECTION } from 'src/tokens';
import { SignalizationService } from './signalization.service';

@WebSocketGateway({ namespace: 'signalization' })
export class SignalizationGateway
	implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
	constructor(
		private readonly logger: LoggerService,
		private readonly signalizationService: SignalizationService,
		@Inject(RTCPEERCONNECTION)
		private PeerConnection: new () => RTCPeerConnection,
	) {}

	private activeSockets: string[] = [];
	private rooms: Map<string, RoomSchema> = new Map();
	private users: Map<string, UserSchema> = new Map();

	@WebSocketServer() server: Server;

	@SubscribeMessage('negotiation')
	async handleNegotiation(
		@MessageBody() data: any,
		@ConnectedSocket() socket: Socket,
	) {
		this.signalizationService.handleNegotiation(data, socket);

		this.logger.info({
			message: 'Connection negotated',
			socket: socket.id,
		});
	}

	@SubscribeMessage('negotiation-accept')
	async handleNegotiationAccept(
		@MessageBody() data: any,
		@ConnectedSocket() socket: Socket,
	) {
		this.signalizationService.handleNegotiationAccept(data, socket);

		this.logger.info({
			message: 'Connection negotated [server]',
			socket: socket.id,
		});
	}

	@SubscribeMessage('user-list')
	async handleUserList(@ConnectedSocket() socket: Socket) {
		try {
			await this.signalizationService.handleUserList(socket);
			this.logger.info({
				message: 'Users fetched',
				socket: socket.id,
			});
		} catch (error) {
			this.logger.error(error);
		}
	}

	@SubscribeMessage('screen-cast')
	handleScreenCast(
		@MessageBody() data: any,
		@ConnectedSocket() socket: Socket,
	) {
		const stream = this.signalizationService.handleScreenCast(data, socket);

		this.logger.info({
			message: 'Screen cast',
			socket: socket.id,
			stream: stream,
		});
	}

	@SubscribeMessage('remove-track')
	handleRemoveTrack(
		@MessageBody() data: any,
		@ConnectedSocket() socket: Socket,
	): void {
		const track = this.signalizationService.handleRemoveTrack(data, socket);

		this.logger.info({
			message: 'Track removed',
			socket: socket.id,
			track: track,
		});
	}

	@SubscribeMessage('click')
	handleClick(
		@MessageBody() data: any,
		@ConnectedSocket() socket: Socket,
	): void {
		const { userId } = data;

		socket.to(userId).emit('click', data);
	}

	@SubscribeMessage('keyToggle')
	hanleKeyToggle(
		@MessageBody() data: any,
		@ConnectedSocket() socket: Socket,
	): void {
		const { userId } = data;

		socket.to(userId).emit('keytoggle', data);
	}

	@SubscribeMessage('create-room')
	async handleCreateRoom(
		@MessageBody() data: CallUserDTO,
		@ConnectedSocket() socket: Socket,
	): Promise<void> {
		try {
			const roomId = await this.signalizationService.createRoom(data, socket);

			this.logger.info({
				message: 'room created',
				roomId: roomId,
				socket: socket.id,
			});
		} catch (error) {
			this.logger.error(error);
		}
	}

	@SubscribeMessage('room-connect')
	async handleConnectRoom(
		@MessageBody() data: ConnectRoomDTO,
		@ConnectedSocket() socket: Socket,
	): Promise<void> {
		try {
			await this.signalizationService.handleConnectRoom(data, socket);

			this.logger.info({
				message: `User ${socket.id} try connect to room`,
				roomId: data.roomId,
			});
		} catch (error) {
			this.logger.error(error);
		}
	}

	@SubscribeMessage('ice-candidate')
	handleIceCandidate(
		@MessageBody() data: IceCandidateDTO,
		@ConnectedSocket() socket: Socket,
	): void {
		this.signalizationService.handleIceCandidate(data, socket);
	}

	handleDisconnect(socket: Socket) {
		this.activeSockets = this.activeSockets.filter(
			(existingSocket) => existingSocket !== socket.id,
		);
		socket.broadcast.emit('remove-user', {
			socketId: socket.id,
		});

		this.logger.log(`Client disconnected: ${socket.id}`);
	}

	handleConnection(socket: Socket) {
		this.logger.log(`Client connected: ${socket.id}`);
	}

	afterInit() {
		this.logger.info(`Socket 'signalization' inited`);
	}
}
