import { prop } from '@typegoose/typegoose';

export class Room {
	@prop({ required: true })
	owner: string;
}
