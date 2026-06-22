import { TestBed } from '@angular/core/testing';
import { LimitsPageComponent } from './limits-page.component';

describe('LimitsPageComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [LimitsPageComponent] });
    const fixture = TestBed.createComponent(LimitsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
