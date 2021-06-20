import { prop, Ref } from '@typegoose/typegoose';
import { Room } from '../room/room';

export class User {
	@prop({ required: true })
	nickname: string;

	@prop({ required: true, ref: Room })
	roomId: Ref<Room>;

	@prop({ default: '' })
	screenCast?: string;

	@prop({ default: [] })
	tracks: string[];
}
