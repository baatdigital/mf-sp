import { TestBed } from '@angular/core/testing';
import { BillpayConciliationPageComponent } from './billpay-conciliation-page.component';

describe('BillpayConciliationPageComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [BillpayConciliationPageComponent] });
    const fixture = TestBed.createComponent(BillpayConciliationPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
