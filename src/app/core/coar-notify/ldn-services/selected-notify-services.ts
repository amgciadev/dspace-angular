import { LdnServicesService } from '@dspace/core/coar-notify/ldn-services/ldn-services-data.service';
import { LdnService } from '@dspace/core/coar-notify/ldn-services/models/ldn-services.model';
import { getFirstCompletedRemoteData } from '@dspace/core/shared/operators';
import {
  forkJoin,
  Observable,
  of,
} from 'rxjs';
import {
  catchError,
  map,
} from 'rxjs/operators';

/**
 * Resolve saved selections independently of the enabled, manual services offered by the dropdown.
 * Keep unavailable IDs visible so opening a submission never silently discards a saved request.
 */
export function loadSelectedNotifyServices(service: LdnServicesService, ids: (number | string)[]): Observable<LdnService[]> {
  if (ids.length === 0) {
    return of([]);
  }
  return forkJoin(ids.map(id => {
    const unavailable = Object.assign(new LdnService(), { id: Number(id), enabled: false });
    return service.findById(String(id)).pipe(
      getFirstCompletedRemoteData(),
      map(rd => rd.hasSucceeded && rd.payload ? rd.payload : unavailable),
      catchError(() => of(unavailable)),
    );
  }));
}
