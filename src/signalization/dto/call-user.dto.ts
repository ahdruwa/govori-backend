import { CommonDTO } from './common.dto';

export class CallUserDTO extends CommonDTO {
	offer: RTCSessionDescriptionInit;
}
