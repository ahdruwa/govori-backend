import { Test, TestingModule } from '@nestjs/testing';
import { SignalizationGateway } from './signalization.gateway';

describe('SignalizationGateway', () => {
  let gateway: SignalizationGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalizationGateway],
    }).compile();

    gateway = module.get<SignalizationGateway>(SignalizationGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
