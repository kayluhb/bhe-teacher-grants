import {describe, expect, it} from 'vitest';
import {
  BENEFIT_SCOPE_LABELS,
  BENEFIT_SCOPES,
  gradesImpactedRequired,
  grantFormChecklist,
  summarizeGrantItems,
  titleFromDescription,
  validateGrantNarrative,
} from '~/lib/grant-application';

describe('BENEFIT_SCOPES', () => {
  it('uses the live form labels in question order', () => {
    expect(BENEFIT_SCOPES.map((scope) => BENEFIT_SCOPE_LABELS[scope])).toEqual([
      'My class',
      'Whole grade',
      'Multiple grades',
      'Whole school',
    ]);
  });
});

describe('gradesImpactedRequired', () => {
  it('is required for whole grade and multiple grades', () => {
    expect(gradesImpactedRequired('WHOLE_GRADE')).toBe(true);
    expect(gradesImpactedRequired('MULTIPLE_GRADES')).toBe(true);
  });

  it('is optional for my class and whole school', () => {
    expect(gradesImpactedRequired('CLASS')).toBe(false);
    expect(gradesImpactedRequired('WHOLE_SCHOOL')).toBe(false);
  });
});

describe('titleFromDescription', () => {
  it('uses the first line as the list heading', () => {
    expect(titleFromDescription('Brainpop Jr subscription')).toBe('Brainpop Jr subscription');
  });

  it('keeps only the first line of a longer writeup', () => {
    expect(
      titleFromDescription(
        'Dyslexia trainings on the latest and greatest research and innovations\nMore detail below.',
      ),
    ).toBe('Dyslexia trainings on the latest and greatest research and innovations');
  });

  it('truncates a long first line for tables', () => {
    const description =
      'I am requesting a set of android tablets, pens, and cases to help bring more technology into the classroom.';
    const title = titleFromDescription(description);
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.startsWith('I am requesting a set of android tablets')).toBe(true);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('validateGrantNarrative', () => {
  const valid = {
    benefitScope: 'MULTIPLE_GRADES',
    description: 'Six stream tables for earth science.',
    gradesImpacted: '4th and 5th',
  };

  it('requires a description', () => {
    const result = validateGrantNarrative({...valid, description: '  '});
    expect(result).toEqual({error: 'Please share a short description of your request.'});
  });

  it('requires a benefit scope from the live form', () => {
    const result = validateGrantNarrative({...valid, benefitScope: ''});
    expect(result).toEqual({error: 'Please choose who this grant will benefit.'});
  });

  it('requires grades when the request is for a whole grade or multiple grades', () => {
    const result = validateGrantNarrative({
      ...valid,
      benefitScope: 'WHOLE_GRADE',
      gradesImpacted: '',
    });
    expect(result).toEqual({error: 'Please say which grades are impacted.'});
  });

  it('allows empty grades for my class', () => {
    const result = validateGrantNarrative({
      benefitScope: 'CLASS',
      description: 'New books for my class library',
      gradesImpacted: '',
    });
    expect(result).toEqual({
      benefitScope: 'CLASS',
      description: 'New books for my class library',
      gradesImpacted: '',
      title: 'New books for my class library',
    });
  });

  it('keeps optional grades for whole school', () => {
    const result = validateGrantNarrative({
      benefitScope: 'WHOLE_SCHOOL',
      description: 'Dyslexia trainings on the latest and greatest research and innovations',
      gradesImpacted: 'K-5',
    });
    expect(result).toMatchObject({
      benefitScope: 'WHOLE_SCHOOL',
      gradesImpacted: 'K-5',
    });
  });
});

describe('grantFormChecklist', () => {
  const blank = {
    benefitScope: '',
    description: '',
    gradesImpacted: '',
    items: [{item_description: '', quantity: 1, unit_price: 0}],
  };

  it('starts with description, items, and who it benefits still open', () => {
    expect(grantFormChecklist(blank)).toEqual([
      {done: false, id: 'description', label: 'Description'},
      {done: false, id: 'items', label: 'At least one item'},
      {done: false, id: 'benefit', label: 'Who it benefits'},
    ]);
  });

  it('marks each filled section done', () => {
    expect(
      grantFormChecklist({
        benefitScope: 'CLASS',
        description: 'Classroom library books',
        gradesImpacted: '',
        items: [{item_description: 'Picture books', quantity: 12, unit_price: 8.5}],
      }),
    ).toEqual([
      {done: true, id: 'description', label: 'Description'},
      {done: true, id: 'items', label: 'At least one item'},
      {done: true, id: 'benefit', label: 'Who it benefits'},
    ]);
  });

  it('asks for grades only when the benefit scope requires them', () => {
    expect(
      grantFormChecklist({
        benefitScope: 'WHOLE_GRADE',
        description: 'Math manipulatives',
        gradesImpacted: '',
        items: [{item_description: 'Base-ten blocks', quantity: 1, unit_price: 40}],
      }),
    ).toEqual([
      {done: true, id: 'description', label: 'Description'},
      {done: true, id: 'items', label: 'At least one item'},
      {done: true, id: 'benefit', label: 'Who it benefits'},
      {done: false, id: 'grades', label: 'Grades impacted'},
    ]);
  });
});

describe('summarizeGrantItems', () => {
  it('skips blank rows and totals named lines', () => {
    expect(
      summarizeGrantItems([
        {item_description: '  ', quantity: 2, unit_price: 10},
        {item_description: 'Chart paper', quantity: 3, unit_price: 12.5},
        {item_description: 'Markers', quantity: 1, unit_price: 4},
      ]),
    ).toEqual({
      count: 2,
      lines: [
        {description: 'Chart paper', quantity: 3, total: 37.5},
        {description: 'Markers', quantity: 1, total: 4},
      ],
      total: 41.5,
    });
  });
});
