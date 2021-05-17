type Room = {
	offer: RTCSessionDescriptionInit;
	iceCandidates: RTCIceCandidateDictionary[];
	users: string[];
	owner: string;
};
