import type {GrantItemInput} from '~/lib/types';

export type DraftItem = GrantItemInput & {clientId: string};

export type WizardScreen =
  | 'welcome'
  | 'description'
  | 'benefit'
  | 'grades'
  | 'itemSource'
  | 'wishlistImport'
  | 'itemDetails'
  | 'addAnother'
  | 'review';

export const PROGRESS_STEPS = ['About you', 'Request', 'Who benefits', 'Items', 'Review'] as const;

export const progressIndexForScreen = (screen: WizardScreen): number => {
  switch (screen) {
    case 'welcome':
      return 0;
    case 'description':
      return 1;
    case 'benefit':
    case 'grades':
      return 2;
    case 'itemSource':
    case 'wishlistImport':
    case 'itemDetails':
    case 'addAnother':
      return 3;
    case 'review':
      return 4;
  }
};

export const emptyItem = (): DraftItem => ({
  clientId: crypto.randomUUID(),
  image_url: null,
  item_description: '',
  quantity: 1,
  source: 'MANUAL',
  unit_price: 0,
});

export const inputClass =
  'font-body mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-eagle-blue focus:ring-1 focus:ring-eagle-blue';

export const isFilledItem = (item: DraftItem): boolean =>
  Boolean(item.item_description.trim()) &&
  Number.isFinite(item.quantity) &&
  item.quantity >= 1 &&
  Number.isFinite(item.unit_price) &&
  item.unit_price >= 0;
