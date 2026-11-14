import { AsyncPipe } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
} from '@angular/core';
import { LdnServicesService } from '@dspace/core/coar-notify/ldn-services/ldn-services-data.service';
import { LdnService } from '@dspace/core/coar-notify/ldn-services/models/ldn-services.model';
import { loadSelectedNotifyServices } from '@dspace/core/coar-notify/ldn-services/selected-notify-services';
import { TranslateModule } from '@ngx-translate/core';
import {
  forkJoin,
  Observable,
  of,
} from 'rxjs';
import { map } from 'rxjs/operators';

/** Read-only display of saved requests for submission and workflow reviewers. */
@Component({
  selector: 'ds-coar-notify-requests',
  templateUrl: './coar-notify-requests.component.html',
  imports: [
    AsyncPipe,
    TranslateModule,
  ],
})
export class CoarNotifyRequestsComponent implements OnChanges {
  @Input() selections: { [pattern: string]: (number | string)[] };

  requests$: Observable<{ pattern: string; services: LdnService[] }[]> = of([]);

  constructor(private ldnServices: LdnServicesService) {
  }

  /** Resolve saved services whenever the submission selection changes. */
  ngOnChanges(): void {
    const requests = Object.entries(this.selections || {})
      .filter(([, ids]) => Array.isArray(ids) && ids.length > 0)
      .map(([pattern, ids]) => loadSelectedNotifyServices(this.ldnServices, ids).pipe(
        map(services => ({ pattern, services })),
      ));
    this.requests$ = requests.length > 0 ? forkJoin(requests) : of([]);
  }
}
