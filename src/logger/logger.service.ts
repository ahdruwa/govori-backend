import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
	constructor(private readonly _context?: string) {
		super(_context);
	}

	public log(message: any, context?: string) {
		Logger.log(JSON.stringify(message, null, 2), context || this._context);
	}
	public info(message: any, context?: string) {
		Logger.log(JSON.stringify(message, null, 2), context || this._context);
	}
	public warn(message: any, context?: string) {
		Logger.warn(JSON.stringify(message, null, 2), context || this._context);
	}
	public error(message: any, trace?: string, context?: string) {
		Logger.error(
			JSON.stringify(message, null, 2),
			trace,
			context || this._context,
		);
	}
}
