export const APP_TITLE = 'BHE PTA Teacher Grants';

export const DOCUMENT_TITLES = {
  admin: 'Admin',
  budget: 'Budget ledger',
  chair: 'Chair',
  fulfill: 'Fulfillment',
  grants: 'Grants',
  grantsNew: 'Create grant',
  home: 'Home',
  login: 'Sign in',
  notFound: 'Not found',
  portal: 'My grants',
  portalNew: 'New grant',
  process: 'Process guide',
  review: 'Review',
} as const;

export const GRANT_TITLE_SECTIONS = {
  chair: 'Chair decision',
  fulfill: 'Purchase',
  grants: 'Grant',
  portal: 'My grant',
  review: 'Review grant',
} as const;

export const grantDocumentTitle = (section: string, title?: string | null): string => {
  const name = title?.trim();
  return name ? `${name} · ${section}` : section;
};
