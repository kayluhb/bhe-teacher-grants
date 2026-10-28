'use client';

import {useMemo, useState} from 'react';
import {sortGrantItemsAction} from '~/community/actions';
import {CopyButton} from '~/components/copy-button';
import {
  type ItemPile,
  pileByClassroom,
  pileByReach,
  type SummaryItem,
  summaryText,
} from '~/lib/community';

type Mode = 'classroom' | 'kind' | 'reach';

const MODES: {label: string; value: Mode}[] = [
  {label: 'By classroom', value: 'classroom'},
  {label: 'By reach', value: 'reach'},
  {label: 'By kind of thing', value: 'kind'},
];

const attribution = (item: SummaryItem) =>
  [item.teacherName.trim(), item.grade.trim()].filter(Boolean).join(', ');

export const GrantSummary = ({
  cycleId,
  cycleName,
  items,
}: {
  cycleId: string;
  cycleName: string;
  items: SummaryItem[];
}) => {
  const [mode, setMode] = useState<Mode>('classroom');
  const [kindPiles, setKindPiles] = useState<ItemPile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const piles = useMemo(() => {
    if (mode === 'classroom') return pileByClassroom(items);
    if (mode === 'reach') return pileByReach(items);
    return kindPiles ?? [{itemIds: items.map((item) => item.id), name: 'Approved items'}];
  }, [items, kindPiles, mode]);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const text = summaryText(cycleName, piles, items);

  const sort = async () => {
    setBusy(true);
    setError('');
    const result = await sortGrantItemsAction(cycleId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setKindPiles(result.piles);
  };

  const rename = (index: number, name: string) => {
    setKindPiles((current) =>
      (current ?? piles).map((pile, pileIndex) => (pileIndex === index ? {...pile, name} : pile)),
    );
  };

  const move = (itemId: string, target: number) => {
    setKindPiles((current) => {
      const source = (current ?? piles).map((pile) => ({
        ...pile,
        itemIds: pile.itemIds.filter((id) => id !== itemId),
      }));
      const pile = source[target];
      if (pile) pile.itemIds = [...pile.itemIds, itemId];
      return source.filter((entry) => entry.itemIds.length > 0);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {MODES.map((option) => (
            <button
              aria-pressed={mode === option.value}
              className={`px-1 py-1.5 text-sm font-medium ${
                mode === option.value
                  ? 'text-eagle-blue underline'
                  : 'text-gray-600 hover:text-charcoal'
              }`}
              key={option.value}
              onClick={() => setMode(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        {items.length > 0 ? (
          <CopyButton
            className="px-1 py-1.5 text-sm font-medium text-eagle-blue hover:underline"
            label="Copy summary"
            text={text}
          />
        ) : null}
      </div>

      {mode === 'kind' ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="bg-eagle-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-eagle-blue/90 disabled:opacity-60"
            disabled={busy || items.length === 0}
            onClick={sort}
            type="button"
          >
            {busy ? 'Sorting…' : 'Sort into piles'}
          </button>
          <p className="font-body text-sm text-gray-600">
            A small model only sorts these names. It cannot add items or mention grants that were
            not approved.
          </p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No items have been approved yet.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {piles.map((pile, index) => (
            <li className="py-2" key={pile.itemIds.join(',') || pile.name}>
              {mode === 'kind' && kindPiles ? (
                <input
                  aria-label="Pile name"
                  className="font-heading w-full border-0 bg-transparent p-0 text-lg font-bold text-charcoal outline-none"
                  onChange={(event) => rename(index, event.target.value)}
                  value={pile.name}
                />
              ) : (
                <h2 className="font-heading text-lg font-bold text-charcoal">{pile.name}</h2>
              )}
              <ul className="mt-3 space-y-3">
                {pile.itemIds.map((id) => {
                  const item = byId.get(id);
                  if (!item) return null;
                  return (
                    <li className="flex items-start justify-between gap-3" key={id}>
                      <div>
                        <p className="font-body text-sm text-charcoal">{item.description}</p>
                        <p className="font-body text-xs text-gray-500">{attribution(item)}</p>
                      </div>
                      {mode === 'kind' && kindPiles && piles.length > 1 ? (
                        <select
                          aria-label={`Move ${item.description}`}
                          className="max-w-36 bg-transparent px-1 py-1 text-xs text-gray-600"
                          onChange={(event) => move(id, Number(event.target.value))}
                          value={index}
                        >
                          {piles.map((option, optionIndex) => (
                            <option
                              key={option.itemIds.join(',') || option.name}
                              value={optionIndex}
                            >
                              {option.name || 'Untitled'}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
