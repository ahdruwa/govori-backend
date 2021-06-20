import { Inject, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { InjectModel } from 'nestjs-typegoose';
import { RTCPEERCONNECTION } from 'src/tokens';
import { RTCSessionDescription, RTCPeerConnection, MediaStream } from 'wrtc';
import { IceCandidateDTO } from './dto/ice-candidate.dto';

import { Room } from './room/room';
import { User } from './user/user';
import { ConnectRoomDTO } from './dto/connect-room.dto';

@Injectable()
export class SignalizationService {
	private rooms: Map<string, RoomSchema> = new Map();
	private users: Map<string, UserSchema> = new Map();

	constructor(
		@InjectModel(User)
		private readonly UserModel,
		@InjectModel(Room)
		private readonly RoomModel,
		@Inject(RTCPEERCONNECTION)
		private readonly PeerConnection: new () => RTCPeerConnection,
	) {}

	onPeerConnectionTrack(e, socket, roomId) {
		const { track, streams } = e;
		const room = this.rooms.get(roomId);
		const { users } = room;

		const user = this.users.get(socket.id);
		const tracks: Set<string> = new Set(user.tracks);
		let screenCast = '';

		if (user.screenCast && user.screenCast === streams[0].id) {
			screenCast = streams[0].id;
		}

		console.log(streams);
		console.log(streams[0].id);

		tracks.add(track.id);
		user.streams = streams[0];
		user.tracks = streams[0].getTracks().map(({ id }) => id);

		console.log(track.kind, track.id);

		users.forEach((userId) => {
			if (userId === socket.id) return;

			const userEntity = this.users.get(userId);

			const { peerConnection: userPeerConnection } = userEntity;

			userPeerConnection.addTrack(track, streams[0]);

			console.log(tracks, user.tracks);

			socket.to(userId).emit('user-update', {
				...user,
				screenCast,
				connectionState: userPeerConnection.connectionState,
				id: socket.id,
			});
		});

		this.users.set(socket.id, {
			...user,
			screenCast,
		});
	}

	async createRoom(data, socket) {
		const roomId = Date.now().toString(10);
		const peerConnection = new this.PeerConnection();

		this.rooms.set(roomId, {
			users: [socket.id],
			owner: socket.id,
		});
		this.users.set(socket.id, {
			nickname: data.nickname,
			peerConnection,
			streams: null,
			roomId,
			tracks: [],
			screenCast: '',
		});

		peerConnection.onconnectionstatechange = (e: any) => {
			const connection: RTCPeerConnection = e.target;
			const connectionState = connection?.connectionState;

			if (
				connectionState === 'failed' ||
				connectionState === 'disconnected'
			) {
				const room = this.rooms.get(roomId);
				const users = room.users.filter((user) => user !== socket.id);
				room.users = users;

				this.rooms.set(roomId, room);
			}
		};

		peerConnection.ontrack = (e) =>
			this.onPeerConnectionTrack(e, socket, roomId);

		peerConnection.onnegotiationneeded = async () => {
			const offer = await peerConnection.createOffer();
			peerConnection.setLocalDescription(offer);

			socket.emit('negotiation-need', {
				offer,
			});
		};

		await peerConnection.setRemoteDescription(
			new RTCSessionDescription(data.offer),
		);

		peerConnection.onicecandidate = (e) => {
			const { candidate } = e;

			if (!candidate) return;

			socket?.emit('ice-candidate', {
				roomId,
				iceCandidate: candidate,
			});
		};

		const answer = await peerConnection.createAnswer();
		await peerConnection.setLocalDescription(answer);

		socket.emit('room-created', {
			roomId: roomId,
			answer,
		});

		return roomId;
	}

	handleIceCandidate(data: IceCandidateDTO, socket: Socket) {
		const { roomId, iceCandidate } = data;

		const { peerConnection } = this.users.get(socket.id);
		if (iceCandidate) {
			peerConnection.addIceCandidate(iceCandidate);
		}
	}

	async handleUserList(socket: Socket) {
		const { roomId } = this.users.get(socket.id);
		const { users } = this.rooms.get(roomId);

		const usersIds = users.filter((id) => id !== socket.id);

		const usersList = usersIds.map((user) => {
			const userEntity = this.users.get(user);

			return {
				...userEntity,
				peerConnection: undefined,
				streams: undefined,
				connectionState: userEntity.peerConnection.connectionState,
				id: user,
			};
		});

		console.log(usersList);

		socket.emit('update-user-list', usersList);
	}

	async handleNegotiation(data: any, socket: Socket) {
		const { offer } = data;

		const { peerConnection } = this.users.get(socket.id);
		await peerConnection.setRemoteDescription(offer);

		const answer = await peerConnection.createAnswer();

		peerConnection.setLocalDescription(answer);

		socket.emit('negotiation', {
			answer,
		});
	}

	async handleNegotiationAccept(data: any, socket: Socket) {
		const { answer } = data;

		const { peerConnection } = this.users.get(socket.id);

		peerConnection.setRemoteDescription(answer);
	}

	handleScreenCast(data: any, socket: Socket) {
		const { stream } = data;
		const user = this.users.get(socket.id);
		user.screenCast = stream;
		this.users.set(socket.id, user);
		const roomId = user.roomId;

		const roomUsers = this.rooms
			.get(roomId)
			.users.filter((id) => id !== socket.id);

		roomUsers.forEach((roomUser) => {
			socket.to(roomUser).emit('user-update', {
				...user,
				connectionState: user.peerConnection.connectionState,
				id: socket.id,
			});
		});

		return stream;
	}

	handleRemoveTrack(data: any, socket: Socket): void {
		const { track } = data;
		const user = this.users.get(socket.id);

		user.tracks = user.tracks.filter((trackId) => track !== trackId);

		this.users.set(socket.id, user);

		const userList = this.rooms.get(user.roomId).users;
		const userListWithoutCurrent = userList.filter(
			(userId) => userId !== socket.id,
		);

		userListWithoutCurrent.forEach((id) => {
			socket.to(id).emit('user-update', {
				...user,
				connectionState: user.peerConnection.connectionState,
				id: socket.id,
			});
		});

		return track;
	}

	async handleConnectRoom(
		data: ConnectRoomDTO,
		socket: Socket,
	): Promise<void> {
		const { roomId, offer, nickname } = data;

		const room = this.rooms.get(data.roomId);

		const peerConnection = new this.PeerConnection();
		this.users.set(socket.id, {
			nickname,
			peerConnection,
			streams: null,
			roomId,
			tracks: [],
			screenCast: '',
		});
		const rootUser = this.users.get(socket.id);

		peerConnection.ontrack = (e) => {
			try {
				this.onPeerConnectionTrack(e, socket, roomId);
			} catch (error) {
				console.error(error);
			}
		};

		await peerConnection.setRemoteDescription(
			new RTCSessionDescription(offer),
		);

		peerConnection.onicecandidate = (e) => {
			console.log('onicecandidate');

			if (!e.candidate) return;

			socket?.emit('ice-candidate', {
				roomId,
				iceCandidate: e.candidate,
			});
		};

		peerConnection.onnegotiationneeded = async () => {
			const offer = await peerConnection.createOffer();
			peerConnection.setLocalDescription(offer);

			socket.emit('negotiation-need', {
				offer,
			});
		};

		const answer = await peerConnection.createAnswer();
		await peerConnection.setLocalDescription(answer);

		console.log(2);

		socket.emit('room-connect--accepted', {
			answer,
			roomId: data.roomId,
		});

		console.log(3);

		room.users.forEach((user) => {
			const userEntity = this.users.get(user);
			const { streams: userStream } = userEntity;

			console.log(100, user);

			if (!userStream || user === socket.id) return;

			socket.to(user).emit('user-update', {
				...rootUser,
				connectionsState: userEntity.peerConnection.connectionState,
				id: socket.id,
			});

			userStream.getTracks().forEach((track) => {
				console.log(track.id, 678);
				peerConnection.addTrack(track, userStream);
			});
		});

		this.rooms.set(data.roomId, {
			...room,
			users: [...room.users, socket.id],
		});
	}
}
