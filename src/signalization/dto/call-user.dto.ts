import { CommonDTO } from './common.dto';

export class CallUserDTO extends CommonDTO {
	offer: RTCSessionDescription;
	nickname: string;
}
