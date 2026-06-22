import { TestBed } from '@angular/core/testing';
import { NotificationsPageComponent } from './notifications-page.component';

describe('NotificationsPageComponent', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [NotificationsPageComponent] });
    const fixture = TestBed.createComponent(NotificationsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
