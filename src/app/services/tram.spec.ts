import { TestBed } from '@angular/core/testing';

import { TramService } from './tram';

describe('Tram', () => {
  let service: TramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
