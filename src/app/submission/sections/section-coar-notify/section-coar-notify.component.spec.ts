import { ChangeDetectorRef } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { LdnServicesService } from '@dspace/core/coar-notify/ldn-services/ldn-services-data.service';
import { NotifyServicePattern } from '@dspace/core/coar-notify/ldn-services/models/ldn-service-patterns.model';
import {
  LdnService,
  LdnServiceByPattern,
} from '@dspace/core/coar-notify/ldn-services/models/ldn-services.model';
import { SubmissionCoarNotifyModel } from '@dspace/core/coar-notify/notify-info/models/submission-coar-notify.model';
import { CoarNotifyConfigDataService } from '@dspace/core/config/coar-notify-config-data.service';
import { JsonPatchOperationsBuilder } from '@dspace/core/json-patch/builder/json-patch-operations-builder';
import { createPaginatedList } from '@dspace/core/testing/utils.test';
import {
  createFailedRemoteDataObject$,
  createSuccessfulRemoteDataObject$,
} from '@dspace/core/utilities/remote-data.utils';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Deserialize } from 'cerialize';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { SectionsService } from '../sections.service';
import { SubmissionSectionCoarNotifyComponent } from './section-coar-notify.component';

describe('SubmissionSectionCoarNotifyComponent', () => {
  let component: SubmissionSectionCoarNotifyComponent;
  let componentAsAny: any;
  let fixture: ComponentFixture<SubmissionSectionCoarNotifyComponent>;

  let ldnServicesService: jasmine.SpyObj<LdnServicesService>;
  let coarNotifyConfigDataService: jasmine.SpyObj<CoarNotifyConfigDataService>;
  let operationsBuilder: jasmine.SpyObj<JsonPatchOperationsBuilder>;
  let sectionService: jasmine.SpyObj<SectionsService>;
  let cdRefStub: any;


  const patterns: SubmissionCoarNotifyModel[] = [Object.assign(new SubmissionCoarNotifyModel(), {
    patterns: [{ pattern: 'review', multipleRequest: false }, { pattern: 'endorsement', multipleRequest: false }],
  })];
  const patternsPL = createPaginatedList(patterns);
  const coarNotifyConfig = createSuccessfulRemoteDataObject$(patternsPL);

  beforeEach(async () => {
    ldnServicesService = jasmine.createSpyObj('LdnServicesService', [
      'findByInboundPattern',
      'findById',
    ]);
    coarNotifyConfigDataService = jasmine.createSpyObj(
      'CoarNotifyConfigDataService',
      ['findAll'],
    );
    operationsBuilder = jasmine.createSpyObj('JsonPatchOperationsBuilder', [
      'remove',
      'replace',
      'add',
      'flushOperation',
    ]);
    sectionService = jasmine.createSpyObj('SectionsService', [
      'dispatchRemoveSectionErrors',
      'getSectionServerErrors',
      'setSectionError',
      'setSectionStatus',
      'getShownSectionErrors',
    ]);
    cdRefStub = Object.assign({
      detectChanges: () => fixture.detectChanges(),
    });

    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), SubmissionSectionCoarNotifyComponent],
      providers: [
        { provide: LdnServicesService, useValue: ldnServicesService },
        { provide: CoarNotifyConfigDataService, useValue: coarNotifyConfigDataService },
        { provide: JsonPatchOperationsBuilder, useValue: operationsBuilder },
        { provide: SectionsService, useValue: sectionService },
        { provide: ChangeDetectorRef, useValue: cdRefStub },
        { provide: 'collectionIdProvider', useValue: 'collectionId' },
        { provide: 'sectionDataProvider', useValue: { id: 'sectionId', data: {} } },
        { provide: 'submissionIdProvider', useValue: 'submissionId' },
        NgbDropdown,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionSectionCoarNotifyComponent);
    component = fixture.componentInstance;
    componentAsAny = component;

    component.patterns = patterns[0].patterns;
    coarNotifyConfigDataService.findAll.and.returnValue(coarNotifyConfig);
    sectionService.getSectionServerErrors.and.returnValue(
      of(
        Object.assign([], {
          path: 'sections/sectionId/data/notifyCoar',
          message: 'error',
        }),
      ),
    );
    ldnServicesService.findByInboundPattern.and.returnValue(createSuccessfulRemoteDataObject$(createPaginatedList([])));
    sectionService.getShownSectionErrors.and.returnValue(of([]));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSectionInit', () => {
    it('should call setCoarNotifyConfig and getSectionServerErrorsAndSetErrorsToDisplay', () => {
      spyOn(component, 'setCoarNotifyConfig');
      spyOn(componentAsAny, 'getSectionServerErrorsAndSetErrorsToDisplay');

      component.onSectionInit();

      expect(component.setCoarNotifyConfig).toHaveBeenCalled();
      expect(componentAsAny.getSectionServerErrorsAndSetErrorsToDisplay).toHaveBeenCalled();
    });
  });

  describe('onChange', () => {
    const ldnPattern = { pattern: 'review', multipleRequest: false };
    const index = 0;
    const selectedService: LdnService = Object.assign(new LdnService(), {
      id: 1,
      name: 'service1',
      notifyServiceInboundPatterns: [
        {
          pattern: 'review',
        },
      ],
      description: '',
    });

    beforeEach(() => {
      component.ldnServiceByPattern[ldnPattern.pattern] = {
        allowsMultipleRequests: false,
        services: [],
      } as LdnServiceByPattern;

      component.patterns = [];
    });

    it('should do nothing if the selected value is the same as the previous one', () => {

      component.ldnServiceByPattern[ldnPattern.pattern].services[index] = selectedService;
      component.onChange(ldnPattern.pattern, index, selectedService);

      expect(componentAsAny.operationsBuilder.remove).not.toHaveBeenCalled();
      expect(componentAsAny.operationsBuilder.replace).not.toHaveBeenCalled();
      expect(componentAsAny.operationsBuilder.add).not.toHaveBeenCalled();
    });

    it('should remove the path when the selected value is null', () => {
      component.ldnServiceByPattern[ldnPattern.pattern].services[index] = selectedService;
      component.onChange(ldnPattern.pattern, index, null);

      expect(componentAsAny.operationsBuilder.flushOperation).toHaveBeenCalledWith(
        componentAsAny.pathCombiner.getPath([ldnPattern.pattern, '-']),
      );
      expect(component.ldnServiceByPattern[ldnPattern.pattern].services[index]).toBeNull();
      expect(component.previousServices[ldnPattern.pattern].services[index]).toBeNull();
    });

    it('should replace the path when there is a previous value stored and it is different from the new one', () => {
      const previousService: LdnService = Object.assign(new LdnService(), {
        id: 2,
        name: 'service2',
        notifyServiceInboundPatterns: [
          {
            pattern: 'endorsement',
          },
        ],
        description: 'test',
      });
      component.ldnServiceByPattern[ldnPattern.pattern].services[index] = previousService;
      component.previousServices[ldnPattern.pattern] = {
        allowsMultipleRequests: false,
        services: [previousService],
      } as LdnServiceByPattern;

      component.onChange(ldnPattern.pattern, index, selectedService);

      expect(componentAsAny.operationsBuilder.add).toHaveBeenCalledWith(
        componentAsAny.pathCombiner.getPath([ldnPattern.pattern, '-']),
        [selectedService.id],
        false,
        true,
      );
      expect(component.ldnServiceByPattern[ldnPattern.pattern].services[index]).toEqual(
        selectedService,
      );
      expect(component.previousServices[ldnPattern.pattern].services[index].id).toEqual(
        selectedService.id,
      );
    });

    it('should add the path when there is no previous value stored', () => {
      component.onChange(ldnPattern.pattern, index, selectedService);

      expect(componentAsAny.operationsBuilder.add).toHaveBeenCalledWith(
        componentAsAny.pathCombiner.getPath([ldnPattern.pattern, '-']),
        [selectedService.id],
        false,
        true,
      );
      expect(component.ldnServiceByPattern[ldnPattern.pattern].services[index]).toEqual(
        selectedService,
      );
      expect(component.previousServices[ldnPattern.pattern].services[index].id).toEqual(
        selectedService.id,
      );
    });
  });

  describe('initSelectedServicesByPattern', () => {
    const pattern1 = { pattern: 'review', multipleRequest: false };
    const pattern2 = { pattern: 'endorsement', multipleRequest: false };
    const service1: LdnService = Object.assign(new LdnService(), {
      id: 1,
      uuid: 1,
      name: 'service1',
      notifyServiceInboundPatterns: [
        Object.assign(new NotifyServicePattern(), {
          pattern: pattern1,
        }),
      ],
    });
    const service2: LdnService = Object.assign(new LdnService(), {
      id: 2,
      uuid: 2,
      name: 'service2',
      notifyServiceInboundPatterns: [
        Object.assign(new NotifyServicePattern(), {
          pattern: pattern2,
        }),
      ],
    });
    const service3: LdnService = Object.assign(new LdnService(), {
      id: 3,
      uuid: 3,
      name: 'service3',
      notifyServiceInboundPatterns: [
        Object.assign(new NotifyServicePattern(), {
          pattern: pattern1,
        }),
        Object.assign(new NotifyServicePattern(), {
          pattern: pattern2,
        }),
      ],
    });

    const services = [service1, service2, service3];

    beforeEach(() => {
      ldnServicesService.findByInboundPattern.and.returnValue(
        createSuccessfulRemoteDataObject$(createPaginatedList(services)),
      );
      component.ldnServiceByPattern[pattern1.pattern] = {
        allowsMultipleRequests: false,
        services: [],
      } as LdnServiceByPattern;

      component.ldnServiceByPattern[pattern2.pattern] = {
        allowsMultipleRequests: false,
        services: [],
      } as LdnServiceByPattern;

      component.patterns = [pattern1, pattern2];

      ldnServicesService.findById.and.callFake(id =>
        createSuccessfulRemoteDataObject$(services.find(service => service.id === Number(id))));
    });

    it('should initialize the selected services by pattern', () => {
      component.initSelectedServicesByPattern();

      expect(component.ldnServiceByPattern[pattern1.pattern].services).toEqual([null]);
      expect(component.ldnServiceByPattern[pattern2.pattern].services).toEqual([null]);
    });

    it('should add the service to the selected services by pattern if the section data has a value for the pattern', () => {
      component.sectionData.data[pattern1.pattern] = [service1.uuid, service3.uuid];
      component.sectionData.data[pattern2.pattern] = [service2.uuid, service3.uuid];
      component.initSelectedServicesByPattern();

      expect(component.ldnServiceByPattern[pattern1.pattern].services).toEqual([
        service1,
        service3,
      ]);
      expect(component.ldnServiceByPattern[pattern2.pattern].services).toEqual([
        service2,
        service3,
      ]);
    });
  });

  describe('saved selections', () => {
    const pattern = 'request-endorsement';
    const service = Deserialize({
      id: 7, name: 'Test endorsement service', enabled: true,
      notifyServiceInboundPatterns: [{ pattern, automatic: true }],
    }, LdnService) as LdnService;

    function reopen(ids: (number | string)[]) {
      component.sectionData.data[pattern] = ids;
      coarNotifyConfigDataService.findAll.and.returnValue(createSuccessfulRemoteDataObject$(createPaginatedList([
        Object.assign(new SubmissionCoarNotifyModel(), { patterns: [{ pattern, multipleRequest: true }] }),
      ])));
      component.setCoarNotifyConfig();
      fixture.detectChanges();
    }

    it('should display a task-created selection even when no manual options are returned', () => {
      ldnServicesService.findById.and.returnValue(createSuccessfulRemoteDataObject$(service));
      reopen([7]);

      expect(ldnServicesService.findById).toHaveBeenCalledWith('7');
      expect(fixture.nativeElement.querySelector('input').value).toBe('Test endorsement service');
      expect(operationsBuilder.add).not.toHaveBeenCalled();
      expect(operationsBuilder.remove).not.toHaveBeenCalled();
    });

    it('should display a saved service after an asynchronous lookup', fakeAsync(() => {
      ldnServicesService.findById.and.returnValue(createSuccessfulRemoteDataObject$(service).pipe(delay(1)));
      reopen([7]);
      tick(1);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('input').value).toBe('Test endorsement service');
      expect(operationsBuilder.add).not.toHaveBeenCalled();
    }));

    it('should retain a disabled service and normalize string IDs', () => {
      ldnServicesService.findById.and.returnValue(createSuccessfulRemoteDataObject$(Object.assign(new LdnService(), service, { enabled: false })));
      reopen(['7']);

      expect(component.ldnServiceByPattern[pattern].services[0].id).toBe(7);
      expect(fixture.nativeElement.querySelector('input').value).toBe('Test endorsement service');
    });

    it('should retain the identity of a service that cannot be loaded', () => {
      ldnServicesService.findById.and.returnValue(createFailedRemoteDataObject$('Not found', 404));
      reopen([7]);

      expect(component.ldnServiceByPattern[pattern].services[0].id).toBe(7);
      expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
      expect(operationsBuilder.remove).not.toHaveBeenCalled();
    });

    it('should remove a saved selection even when it is absent from the dropdown', () => {
      ldnServicesService.findById.and.returnValue(createSuccessfulRemoteDataObject$(service));
      reopen([7]);
      component.onChange(pattern, 0, null);

      expect(operationsBuilder.remove).toHaveBeenCalledWith(componentAsAny.pathCombiner.getPath([pattern, '0']));
      expect(operationsBuilder.add).not.toHaveBeenCalled();
    });

    it('should cache available options across repeated template evaluations', () => {
      component.filterServices(pattern).subscribe();
      component.filterServices(pattern).subscribe();
      expect(ldnServicesService.findByInboundPattern.calls.allArgs().filter(args => args[0] === pattern).length).toBe(1);
    });
  });

  describe('addService', () => {
    const ldnPattern = { pattern: 'review', multipleRequest: false };
    const service: any = {
      id: 1,
      name: 'service1',
      notifyServiceInboundPatterns: [{ pattern: ldnPattern.pattern }],
    };

    beforeEach(() => {
      component.ldnServiceByPattern[ldnPattern.pattern] = {
        allowsMultipleRequests: false,
        services: [],
      } as LdnServiceByPattern;
    });

    it('should push the new service to the array corresponding to the pattern', () => {
      component.addService(ldnPattern, service);

      expect(component.ldnServiceByPattern[ldnPattern.pattern].services).toEqual([service]);
    });
  });

  describe('removeService', () => {
    const ldnPattern = { pattern: 'review', multipleRequest: false };
    const service1: LdnService = Object.assign(new LdnService(), {
      id: 1,
      name: 'service1',
      notifyServiceInboundPatterns: [
        Object.assign(new NotifyServicePattern(), {
          pattern: ldnPattern.pattern,
        }),
      ],
    });
    const service2: LdnService = Object.assign(new LdnService(), {
      id: 2,
      name: 'service2',
      notifyServiceInboundPatterns: [
        Object.assign(new NotifyServicePattern(), {
          pattern: ldnPattern.pattern,
        }),
      ],
    });
    const service3: LdnService = Object.assign(new LdnService(), {
      id: 3,
      name: 'service3',
      notifyServiceInboundPatterns: [
        Object.assign(new NotifyServicePattern(), {
          pattern: ldnPattern.pattern,
        }),
      ],
    });

    beforeEach(() => {
      component.ldnServiceByPattern[ldnPattern.pattern] = {
        allowsMultipleRequests: false,
        services: [],
      } as LdnServiceByPattern;
    });


    it('should remove the service at the specified index from the array corresponding to the pattern', () => {
      component.ldnServiceByPattern[ldnPattern.pattern].services = [service1, service2, service3];
      component.removeService(ldnPattern, 1);

      expect(component.ldnServiceByPattern[ldnPattern.pattern].services).toEqual([
        service1,
        service3,
      ]);
    });
  });

  describe('filterServices', () => {
    const pattern = 'review';
    const service1: any = {
      id: 1,
      name: 'service1',
      notifyServiceInboundPatterns: [{ pattern: pattern }],
    };
    const service2: any = {
      id: 2,
      name: 'service2',
      notifyServiceInboundPatterns: [{ pattern: pattern }],
    };
    const service3: any = {
      id: 3,
      name: 'service3',
      notifyServiceInboundPatterns: [{ pattern: pattern }],
    };
    const services = [service1, service2, service3];

    beforeEach(() => {
      componentAsAny.filteredServicesByPattern = {};
      ldnServicesService.findByInboundPattern.and.returnValue(
        createSuccessfulRemoteDataObject$(createPaginatedList(services)),
      );
    });

    it('should return an observable of the services that match the given pattern', () => {
      component.filterServices(pattern).subscribe((result) => {
        expect(result).toEqual(services);
      });
    });
  });

  describe('hasInboundPattern', () => {
    const pattern = 'review';
    const service: any = {
      id: 1,
      name: 'service1',
      notifyServiceInboundPatterns: [{ pattern: pattern }],
    };

    it('should return true if the service has the specified inbound pattern type', () => {
      expect(component.hasInboundPattern(service, pattern)).toBeTrue();
    });

    it('should return false if the service does not have the specified inbound pattern type', () => {
      expect(component.hasInboundPattern(service, 'endorsement')).toBeFalse();
    });
  });

  describe('getSectionServerErrorsAndSetErrorsToDisplay', () => {
    it('should set the validation errors for the current section to display', () => {
      const validationErrors = [
        { path: 'sections/sectionId/data/notifyCoar', message: 'error' },
      ];
      sectionService.getSectionServerErrors.and.returnValue(
        of(validationErrors),
      );

      componentAsAny.getSectionServerErrorsAndSetErrorsToDisplay();

      expect(sectionService.setSectionError).toHaveBeenCalledWith(
        component.submissionId,
        component.sectionData.id,
        validationErrors[0],
      );
    });
  });

  describe('onSectionDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      const sub1 = of(null).subscribe();
      const sub2 = of(null).subscribe();
      componentAsAny.subs = [sub1, sub2];
      spyOn(sub1, 'unsubscribe');
      spyOn(sub2, 'unsubscribe');
      component.onSectionDestroy();
      expect(sub1.unsubscribe).toHaveBeenCalled();
      expect(sub2.unsubscribe).toHaveBeenCalled();
    });
  });
});
