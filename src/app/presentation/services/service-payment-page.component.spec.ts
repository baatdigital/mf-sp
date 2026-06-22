import { TestBed } from '@angular/core/testing';
import { ServicePaymentPageComponent } from './service-payment-page.component';

describe('ServicePaymentPageComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [ServicePaymentPageComponent] });
    const fixture = TestBed.createComponent(ServicePaymentPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
