type UserSchema = {
	nickname: string;
	peerConnection: RTCPeerConnection;
	streams: MediaStream;
	roomId: string;
	tracks: string[];
	screenCast: string;
};
