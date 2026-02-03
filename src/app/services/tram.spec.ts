import { TestBed } from '@angular/core/testing';

import { Tram } from './tram';

describe('Tram', () => {
  let service: Tram;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tram);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
