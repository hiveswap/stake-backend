import { Test, TestingModule } from '@nestjs/testing';
import { TrustaService } from './trusta.service';

describe('TrustaService', () => {
  let service: TrustaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrustaService],
    }).compile();

    service = module.get<TrustaService>(TrustaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
