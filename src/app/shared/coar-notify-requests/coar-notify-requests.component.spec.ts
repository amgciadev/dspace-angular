import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { LdnServicesService } from '@dspace/core/coar-notify/ldn-services/ldn-services-data.service';
import { LdnService } from '@dspace/core/coar-notify/ldn-services/models/ldn-services.model';
import { createSuccessfulRemoteDataObject$ } from '@dspace/core/utilities/remote-data.utils';
import { TranslateModule } from '@ngx-translate/core';
import { throwError } from 'rxjs';

import { CoarNotifyRequestsComponent } from './coar-notify-requests.component';

describe('CoarNotifyRequestsComponent', () => {
  let fixture: ComponentFixture<CoarNotifyRequestsComponent>;
  let services: jasmine.SpyObj<LdnServicesService>;

  beforeEach(async () => {
    services = jasmine.createSpyObj('LdnServicesService', ['findById']);
    services.findById.and.callFake(id => createSuccessfulRemoteDataObject$(
      Object.assign(new LdnService(), { id: Number(id), name: `Service ${id}`, enabled: true })));
    await TestBed.configureTestingModule({
      imports: [CoarNotifyRequestsComponent, TranslateModule.forRoot()],
      providers: [{ provide: LdnServicesService, useValue: services }],
    }).compileComponents();
    fixture = TestBed.createComponent(CoarNotifyRequestsComponent);
  });

  it('should show saved services grouped by action in saved order', () => {
    fixture.componentRef.setInput('selections', { 'request-endorsement': [7, 3], 'request-review': [2] });
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('dd')) as HTMLElement[];
    expect(labels.map(label => label.textContent.trim())).toEqual(['Service 7', 'Service 3', 'Service 2']);
    expect(fixture.nativeElement.querySelectorAll('dt').length).toBe(2);
    expect(fixture.nativeElement.querySelector('input, button')).toBeNull();
  });

  it('should keep a failed lookup visible while displaying other saved services', () => {
    services.findById.and.callFake(id => id === '7' ? throwError(() => new Error('Unavailable'))
      : createSuccessfulRemoteDataObject$(Object.assign(new LdnService(), { id: 3, name: 'Service 3', enabled: true })));
    fixture.componentRef.setInput('selections', { 'request-endorsement': [7, 3] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('dd').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Service 3');
  });

  it('should not request services or show an empty heading when there are no selections', () => {
    fixture.componentRef.setInput('selections', {});
    fixture.detectChanges();

    expect(services.findById).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });
});
