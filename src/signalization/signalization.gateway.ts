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
import { MakeAnswerDTO } from './dto/make-answer.dto';
import { RejectCallDTO } from './dto/reject-call.dto';
import { IceCandidateDTO } from './dto/ice-candidate.dto';
import { ConnectRoomAcceptedDTO } from './dto/connect-room-accepted.dto';
import { ConnectRoomDTO } from './dto/connect-room.dto';

@WebSocketGateway({ namespace: 'signalization' })
export class SignalizationGateway
	implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
	constructor(private readonly logger: LoggerService) {}

	private activeSockets: string[] = [];
	private rooms: Map<string, Room> = new Map();

	@WebSocketServer() server: Server;

	@SubscribeMessage('call-user')
	handleCall(
		@MessageBody() data: CallUserDTO,
		@ConnectedSocket() socket: Socket,
	): void {
		this.logger.info('user called ' + data.destination);

		socket.to(data.destination).emit('call-made', {
			offer: data.offer,
			socket: socket.id,
		});
	}

	@SubscribeMessage('create-room')
	handleCreateRoom(
		@MessageBody() data: CallUserDTO,
		@ConnectedSocket() socket: Socket,
	): void {
		const roomId = Date.now().toString(10);

		this.rooms.set(roomId, {
			offer: data.offer,
			iceCandidates: [],
			users: [socket.id],
			owner: socket.id,
		});

		socket.emit('room-created', {
			roomId: roomId,
		});
		this.logger.info({
			message: 'room created',
			roomId: roomId,
			socket: socket.id,
		});
	}

	@SubscribeMessage('room-connect')
	handleConnectRoom(
		@MessageBody() data: ConnectRoomDTO,
		@ConnectedSocket() socket: Socket,
	): void {
		const room = this.rooms.get(data.roomId);
		this.rooms.set(data.roomId, room);

		socket.emit('room-connect--accepted', {
			offer: room.offer,
			roomId: data.roomId,
		});

		this.logger.info({
			message: `User ${socket.id} try connect to room`,
			roomId: data.roomId,
		});
	}

	@SubscribeMessage('room-connect--accepted')
	handleConnectAcceptedRoom(
		@MessageBody() data: ConnectRoomAcceptedDTO,
		@ConnectedSocket() socket: Socket,
	): void {
		const room = this.rooms.get(data.roomId);
		this.rooms.set(data.roomId, room);

		room.users.forEach((user) => {
			socket.to(user).emit('new-user', {
				answer: data.answer,
				user: socket.id,
			});
		});

		console.log(room.iceCandidates);

		room.iceCandidates.forEach((ic) => {
			socket.emit('ice-candidate', {
				iceCandidate: ic,
			});
		});

		room.users.push(socket.id);

		this.logger.info({
			message: `User ${socket.id} connected to room`,
			roomId: data.roomId,
		});
	}

	@SubscribeMessage('ice-candidate')
	handleIceCandidate(
		@MessageBody() data: IceCandidateDTO,
		@ConnectedSocket() socket: Socket,
	): void {
		const room = this.rooms.get(data.roomId);
		room.iceCandidates.push(data.iceCandidate);

		console.log(room.users);

		room.users.forEach((user) => {
			socket.to(user).emit('ice-candidate', {
				iceCandidate: data.iceCandidate,
			});
		});
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
		const existingSocket = this.activeSockets.find(
			(existingSocket) => existingSocket === socket.id,
		);

		if (!existingSocket) {
			this.activeSockets.push(socket.id);

			socket.emit('update-user-list', {
				users: this.activeSockets.filter(
					(existingSocket) => existingSocket !== socket.id,
				),
			});

			socket.broadcast.emit('update-user-list', {
				users: [socket.id],
			});
		}

		this.logger.log(`Client connected: ${socket.id}`);
	}

	afterInit() {
		this.logger.info(`Socket 'signalization' inited`);
	}
}
