import {describe, expect, it} from 'vitest';
import fixtures from '~/tour/fixtures.json';
import {
  fixturesFor,
  hasSeenTour,
  hydrateTourGrant,
  markTourSeen,
  overlayTourGrants,
  stepsFor,
  tourPageFromPath,
  tourStorageKey,
  visibleTourSteps,
} from '~/tour/tour';

describe('tourPageFromPath', () => {
  it('maps each portal home to a tour', () => {
    expect(tourPageFromPath('/portal')).toBe('teacher');
    expect(tourPageFromPath('/review')).toBe('reviewer');
    expect(tourPageFromPath('/chair')).toBe('chairman');
    expect(tourPageFromPath('/')).toBe('treasurer');
    expect(tourPageFromPath('/fulfill')).toBe('fulfill');
  });

  it('skips detail and form pages so highlights have a home', () => {
    expect(tourPageFromPath('/portal/new')).toBeNull();
    expect(tourPageFromPath('/portal/grant_1')).toBeNull();
    expect(tourPageFromPath('/review/grant_1')).toBeNull();
    expect(tourPageFromPath('/chair/grant_1')).toBeNull();
    expect(tourPageFromPath('/fulfill/grant_1')).toBeNull();
    expect(tourPageFromPath('/admin')).toBeNull();
    expect(tourPageFromPath('/budget')).toBeNull();
  });
});

describe('overlayTourGrants', () => {
  const sample = hydrateTourGrant({
    id: 'real_1',
    status: 'PENDING',
    title: 'Real classroom rugs',
  });

  it('uses fixtures only while the tour is running and the list is empty', () => {
    const fixturesRows = fixturesFor('teacher');
    expect(overlayTourGrants({fixtures: fixturesRows, real: [], tourActive: true})).toEqual({
      grants: fixturesRows,
      usingFixtures: true,
    });
  });

  it('keeps real rows even while the tour is running', () => {
    expect(
      overlayTourGrants({
        fixtures: fixturesFor('teacher'),
        real: [sample],
        tourActive: true,
      }),
    ).toEqual({grants: [sample], usingFixtures: false});
  });

  it('does not invent grants when the tour is off', () => {
    expect(
      overlayTourGrants({
        fixtures: fixturesFor('teacher'),
        real: [],
        tourActive: false,
      }),
    ).toEqual({grants: [], usingFixtures: false});
  });
});

describe('tour storage', () => {
  it('records a seen tour per portal', () => {
    const storage = new Map<string, string>();
    const api = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };

    expect(hasSeenTour(api, 'teacher')).toBe(false);
    markTourSeen(api, 'teacher');
    expect(hasSeenTour(api, 'teacher')).toBe(true);
    expect(hasSeenTour(api, 'reviewer')).toBe(false);
    expect(storage.get(tourStorageKey('teacher'))).toBe('1');
  });
});

describe('fixtures and steps', () => {
  it('has at least one sample grant for each overlay queue', () => {
    expect(fixtures.teacher.length).toBeGreaterThan(0);
    expect(fixtures.reviewer.length).toBeGreaterThan(0);
    expect(fixtures.chairman.length).toBeGreaterThan(0);
    expect(fixtures.fulfill.length).toBeGreaterThan(0);
  });

  it('hydrates JSON rows into grant table rows', () => {
    const row = fixturesFor('teacher')[0];
    expect(row?.title).toBeTruthy();
    expect(row?.status).toBeTruthy();
    expect(row?.requested_amount).toBeGreaterThan(0);
  });

  it('anchors every step on a data-tour selector', () => {
    for (const page of ['teacher', 'reviewer', 'chairman', 'treasurer', 'fulfill'] as const) {
      const steps = stepsFor(page);
      expect(steps.length).toBeGreaterThan(1);
      for (const step of steps) {
        expect(step.element).toMatch(/^\[data-tour="[a-z0-9-]+"\]$/);
        expect(step.popover.title).toBeTruthy();
        expect(step.popover.description).toBeTruthy();
      }
    }
  });

  it('drops optional steps whose targets are missing', () => {
    const steps = [
      {
        element: '[data-tour="page-heading"]',
        popover: {description: 'Always here', title: 'Heading'},
      },
      {
        element: '[data-tour="nav-review"]',
        optional: true,
        popover: {description: 'Only if seated', title: 'Review'},
      },
    ];
    expect(visibleTourSteps(steps, (selector) => selector.includes('page-heading'))).toEqual([
      steps[0],
    ]);
  });
});
