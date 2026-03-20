import { TestBed } from '@angular/core/testing';
import { MyServicesPageComponent } from './my-services-page.component';

describe('MyServicesPageComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [MyServicesPageComponent] });
    const fixture = TestBed.createComponent(MyServicesPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
