import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RemoteEntryComponent } from './entry.component';

describe('RemoteEntryComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({
      imports: [RemoteEntryComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(RemoteEntryComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
