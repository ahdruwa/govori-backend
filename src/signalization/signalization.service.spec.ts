import { Test, TestingModule } from '@nestjs/testing';
import { SignalizationService } from './signalization.service';

describe('SignalizationService', () => {
	let service: SignalizationService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [SignalizationService],
		}).compile();

		service = module.get<SignalizationService>(SignalizationService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
