import type {Role} from '~/lib/roles';

const COMMUNITY_GRANT_STATUSES = ['APPROVED', 'PURCHASED', 'DELIVERED'] as const;

export {COMMUNITY_GRANT_STATUSES};

export const communityGrantVisible = (status: string): boolean =>
  (COMMUNITY_GRANT_STATUSES as readonly string[]).includes(status);

export const communityItemLines = (
  items: {is_ad_hoc: number; item_description: string; item_status: string}[],
): string[] =>
  items
    .filter((item) => item.is_ad_hoc === 0 && item.item_status !== 'CANCELLED')
    .map((item) => item.item_description.trim())
    .filter(Boolean);

export const canViewGrantSummary = (
  user: {role: Role | string},
  seatedChairman: boolean,
): boolean => user.role === 'admin' || user.role === 'chair' || seatedChairman;

export type SummaryItem = {
  benefitScope: string;
  description: string;
  grade: string;
  id: string;
  teacherName: string;
};

export type ItemPile = {
  itemIds: string[];
  name: string;
};

export type ModelSorter = {
  run: (model: string, input: {messages: {content: string; role: string}[]}) => Promise<unknown>;
};

const MODEL = '@cf/meta/llama-3.2-3b-instruct';

const REACH: Record<string, string> = {
  CLASS: 'One class',
  MULTIPLE_GRADES: 'More than one grade',
  WHOLE_GRADE: 'A whole grade',
  WHOLE_SCHOOL: 'The whole school',
};

const groupBy = (items: SummaryItem[], nameFor: (item: SummaryItem) => string): ItemPile[] => {
  const order: string[] = [];
  const ids = new Map<string, string[]>();
  for (const item of items) {
    const name = nameFor(item);
    const list = ids.get(name);
    if (list) list.push(item.id);
    else {
      order.push(name);
      ids.set(name, [item.id]);
    }
  }
  return order.map((name) => ({itemIds: ids.get(name) ?? [], name}));
};

const classroomName = (item: SummaryItem) =>
  [item.teacherName.trim(), item.grade.trim()].filter(Boolean).join(' · ') || 'Classroom';

export const pileByClassroom = (items: SummaryItem[]): ItemPile[] => groupBy(items, classroomName);

export const pileByReach = (items: SummaryItem[]): ItemPile[] =>
  groupBy(items, (item) => REACH[item.benefitScope] ?? 'Other');

const cleanName = (name: unknown) => {
  const text = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  return text.slice(0, 40) || 'More';
};

export const pilesFromModel = (items: SummaryItem[], raw: unknown): ItemPile[] => {
  const known = new Set(items.map((item) => item.id));
  const groups =
    raw && typeof raw === 'object' && 'groups' in raw ? (raw as {groups: unknown}).groups : null;
  const piles: ItemPile[] = [];
  const used = new Set<string>();
  if (Array.isArray(groups)) {
    for (const group of groups) {
      if (!group || typeof group !== 'object') continue;
      const record = group as {itemIds?: unknown; name?: unknown};
      const itemIds = Array.isArray(record.itemIds)
        ? record.itemIds.filter(
            (id): id is string => typeof id === 'string' && known.has(id) && !used.has(id),
          )
        : [];
      for (const id of itemIds) used.add(id);
      if (itemIds.length === 0) continue;
      piles.push({itemIds, name: cleanName(record.name)});
    }
  }
  const left = items.map((item) => item.id).filter((id) => !used.has(id));
  if (left.length > 0) piles.push({itemIds: left, name: 'Still to place'});
  return piles;
};

const itemLine = (item: SummaryItem) => {
  const who = [item.teacherName.trim(), item.grade.trim()].filter(Boolean).join(', ');
  return who ? `- ${item.description.trim()} — ${who}` : `- ${item.description.trim()}`;
};

export const summaryText = (cycleName: string, piles: ItemPile[], items: SummaryItem[]): string => {
  const heading = cycleName.trim();
  if (items.length === 0) return `${heading}\n\nNo items have been approved yet.`;
  const byId = new Map(items.map((item) => [item.id, item]));
  const blocks = piles.flatMap((pile) => {
    const lines = pile.itemIds.flatMap((id) => {
      const item = byId.get(id);
      return item ? [itemLine(item)] : [];
    });
    return lines.length > 0 ? [[pile.name, ...lines].join('\n')] : [];
  });
  return [heading, ...blocks].join('\n\n');
};

const responseText = (payload: unknown) => {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as {choices?: {message?: {content?: unknown}}[]; response?: unknown};
  if (typeof record.response === 'string') return record.response;
  const content = record.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
};

const modelGroups = (payload: unknown): unknown => {
  if (payload && typeof payload === 'object' && 'response' in payload) {
    const response = (payload as {response: unknown}).response;
    if (response && typeof response === 'object') return response;
  }
  return parseGroups(responseText(payload));
};

const parseGroups = (text: string): unknown => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

export const sortItemsWithModel = async (
  ai: ModelSorter | undefined,
  items: SummaryItem[],
): Promise<{ok: true; piles: ItemPile[]} | {error: string; ok: false}> => {
  if (!ai) return {error: 'Workers AI is not configured.', ok: false};
  if (items.length === 0) return {ok: true, piles: []};
  const catalog = items
    .slice(0, 80)
    .map((item) => `${item.id} | ${item.description.replaceAll('|', '/')} | ${item.grade}`)
    .join('\n');
  let payload: unknown;
  try {
    payload = await ai.run(MODEL, {
      messages: [
        {
          content:
            'Sort these school items into 3 to 6 short group names a parent would understand. Reply with JSON only, shaped as {"groups":[{"name":"Reading","itemIds":["id"]}]}. Use only the ids given. Do not invent items or rename them.',
          role: 'system',
        },
        {content: catalog, role: 'user'},
      ],
    });
  } catch {
    return {error: 'Workers AI could not sort these items.', ok: false};
  }
  const parsed = modelGroups(payload);
  if (!parsed) return {error: 'The sorter sent something we could not read.', ok: false};
  const sent = items.slice(0, 80);
  const piles = pilesFromModel(sent, parsed);
  if (!piles.some((pile) => pile.name !== 'Still to place')) {
    return {error: 'The sorter did not place any items.', ok: false};
  }
  const rest = items.slice(80).map((item) => item.id);
  if (rest.length === 0) return {ok: true, piles};
  const still = piles.find((pile) => pile.name === 'Still to place');
  if (still) still.itemIds.push(...rest);
  else piles.push({itemIds: rest, name: 'Still to place'});
  return {ok: true, piles};
};
