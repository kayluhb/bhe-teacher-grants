'use client';

import {useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {type DirectoryPerson, type PersonSuggestion, suggestPeople} from '~/lib/people';
import type {Result} from '~/lib/types';

type MenuBox = {bottom?: number; left: number; top?: number; width: number};

const fieldClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-spirit-gold focus:ring-2 focus:ring-spirit-gold/40';

export const CommitteePicker = ({
  excludeIds = [],
  onAdd,
  onRemove,
  people,
  selected,
}: {
  excludeIds?: string[];
  onAdd: (input: {email: string; name?: string}) => Promise<Result<DirectoryPerson>>;
  onRemove: (userId: string) => Promise<Result<{ok: true}>>;
  people: DirectoryPerson[];
  selected: DirectoryPerson[];
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState('');
  const [menu, setMenu] = useState<MenuBox | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const taken = useMemo(
    () => new Set([...excludeIds, ...selected.map((person) => person.id)]),
    [excludeIds, selected],
  );
  const suggestions = useMemo(
    () => suggestPeople(people, query, [...taken]),
    [people, query, taken],
  );
  const composing = draftName !== null;
  const showMenu = open && !composing && suggestions.length > 0;

  useEffect(() => {
    if (!composing) return;
    nameRef.current?.focus();
  }, [composing]);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  useLayoutEffect(() => {
    if (!showMenu) {
      setMenu(null);
      return;
    }
    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const openUp = window.innerHeight - rect.bottom < 220;
      setMenu({
        left: rect.left,
        width: rect.width,
        ...(openUp ? {bottom: window.innerHeight - rect.top + 4} : {top: rect.bottom + 4}),
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showMenu]);

  const addPerson = async (email: string, name?: string) => {
    setPending(true);
    setError(null);
    const result = await onAdd({email, name});
    setPending(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setQuery('');
    setOpen(false);
    setDraftName(null);
    setDraftEmail('');
  };

  const choose = (suggestion: PersonSuggestion) => {
    if (suggestion.kind === 'invalid') {
      setError(suggestion.message);
      return;
    }
    if (suggestion.kind === 'draft') {
      setDraftName(suggestion.name);
      setDraftEmail('');
      setOpen(false);
      setError(null);
      return;
    }
    void addPerson(suggestion.kind === 'create' ? suggestion.email : suggestion.person.email);
  };

  const remove = async (userId: string) => {
    setPending(true);
    setError(null);
    const result = await onRemove(userId);
    setPending(false);
    if ('error' in result) setError(result.error);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const suggestion = suggestions[active];
      if (suggestion) choose(suggestion);
      return;
    }
    if (event.key === 'Escape') setOpen(false);
  };

  const submitDraft = () => {
    if (!draftName?.trim() || !draftEmail.trim()) {
      setError('Enter a name and email.');
      return;
    }
    void addPerson(draftEmail, draftName.trim());
  };

  return (
    <div className="space-y-3" data-committee-picker="" ref={rootRef}>
      <ul className="flex flex-wrap gap-2">
        {selected.map((person) => (
          <li
            className="flex items-center gap-2 rounded-full border border-eagle-blue/20 bg-warm-white px-3 py-1.5"
            key={person.id}
          >
            <span className="min-w-0">
              <span className="font-heading block text-sm font-semibold text-eagle-blue">
                {person.name}
              </span>
              <span className="block text-xs text-gray-500">{person.email}</span>
            </span>
            <button
              aria-label={`Remove ${person.name}`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-charcoal"
              disabled={pending}
              onClick={() => void remove(person.id)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      {composing ? (
        <div className="grid gap-2 rounded-xl border border-spirit-gold/40 bg-warm-white p-3">
          <label className="text-sm font-medium text-charcoal">
            Name
            <input
              className={`mt-1 ${fieldClass}`}
              disabled={pending}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                submitDraft();
              }}
              ref={nameRef}
              value={draftName ?? ''}
            />
          </label>
          <label className="text-sm font-medium text-charcoal">
            Email
            <input
              className={`mt-1 ${fieldClass}`}
              disabled={pending}
              onChange={(event) => {
                setDraftEmail(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                submitDraft();
              }}
              placeholder="name@bheeagles.com"
              type="email"
              value={draftEmail}
            />
          </label>
          <div className="flex gap-2">
            <button
              className="btn btn-brand"
              disabled={pending}
              onClick={submitDraft}
              type="button"
            >
              Add person
            </button>
            <button
              className="btn btn-secondary"
              disabled={pending}
              onClick={() => {
                setDraftName(null);
                setDraftEmail('');
                setError(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showMenu}
            autoComplete="off"
            className={fieldClass}
            disabled={pending}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
              setError(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search a name or type an email"
            ref={inputRef}
            role="combobox"
            value={query}
          />
          {showMenu && menu ? (
                <div
                  className="z-[100] max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                  data-committee-menu=""
                  id={listId}
                  onMouseDown={(event) => event.preventDefault()}
                  ref={menuRef}
                  role="listbox"
                  style={{
                    bottom: menu.bottom,
                    left: menu.left,
                    position: 'fixed',
                    top: menu.top,
                    width: menu.width,
                  }}
                >
                  {suggestions.map((suggestion, index) => {
                    const activeRow = index === active;
                    const rowClass = `flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                      activeRow ? 'bg-eagle-blue/10' : 'hover:bg-warm-white'
                    }`;
                    if (suggestion.kind === 'create') {
                      return (
                        <button
                          aria-selected={activeRow}
                          className={rowClass}
                          key={`create-${suggestion.email}`}
                          onClick={() => choose(suggestion)}
                          role="option"
                          type="button"
                        >
                          <span className="font-heading rounded-full bg-spirit-gold px-2 py-0.5 text-xs font-semibold text-night-blue">
                            Add
                          </span>
                          <span>
                            <span className="block font-medium text-charcoal">
                              {suggestion.email}
                            </span>
                            <span className="text-xs text-gray-500">
                              Create and add to committee
                            </span>
                          </span>
                        </button>
                      );
                    }
                    if (suggestion.kind === 'draft') {
                      return (
                        <button
                          aria-selected={activeRow}
                          className={rowClass}
                          key={`draft-${suggestion.name}`}
                          onClick={() => choose(suggestion)}
                          role="option"
                          type="button"
                        >
                          <span className="font-heading rounded-full bg-spirit-gold px-2 py-0.5 text-xs font-semibold text-night-blue">
                            New
                          </span>
                          <span>
                            <span className="block font-medium text-charcoal">
                              Create “{suggestion.name}”
                            </span>
                            <span className="text-xs text-gray-500">
                              Add a name and email, then they can sign in later
                            </span>
                          </span>
                        </button>
                      );
                    }
                    if (suggestion.kind === 'invalid') {
                      return (
                        <p
                          className="px-3 py-2 text-sm text-red-700"
                          key={`invalid-${suggestion.message}`}
                          role="alert"
                        >
                          {suggestion.message}
                        </p>
                      );
                    }
                    return (
                      <button
                        aria-selected={activeRow}
                        className={`flex w-full flex-col px-3 py-2 text-left ${
                          activeRow ? 'bg-eagle-blue/10' : 'hover:bg-warm-white'
                        }`}
                        key={suggestion.person.id}
                        onClick={() => choose(suggestion)}
                        role="option"
                        type="button"
                      >
                        <span className="font-heading text-sm font-semibold text-charcoal">
                          {suggestion.person.name}
                        </span>
                        <span className="text-xs text-gray-500">{suggestion.person.email}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
        </div>
      )}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Search a name to create someone new, or type an AISD or BHE email. They can sign in later.
        </p>
      )}
    </div>
  );
};
