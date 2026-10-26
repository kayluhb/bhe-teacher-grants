import Link from 'next/link';
import {type RosterQuery, rosterPath} from '~/lib/roster-query';

const pageNumbers = (page: number, pageCount: number): number[] => {
  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, start + 4);
  const first = Math.max(1, end - 4);
  return Array.from({length: end - first + 1}, (_, index) => first + index);
};

export const RosterPager = ({query, total}: {query: RosterQuery; total: number}) => {
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const start = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const end = Math.min(query.page * query.pageSize, total);
  const href = (page: number) => rosterPath({page, q: query.q, role: query.role, tab: 'roster'});

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
      <p className="text-sm text-gray-600">
        {total === 0 ? 'No people' : `Showing ${start}–${end} of ${total}`}
      </p>
      {pageCount > 1 ? (
        <nav aria-label="Roster pages" className="flex flex-wrap items-center gap-1">
          {query.page > 1 ? (
            <Link className="btn btn-secondary px-3 py-1.5" href={href(query.page - 1)}>
              Previous
            </Link>
          ) : (
            <button className="btn btn-secondary px-3 py-1.5" disabled type="button">
              Previous
            </button>
          )}
          {pageNumbers(query.page, pageCount).map((page) => {
            const current = page === query.page;
            return (
              <Link
                aria-current={current ? 'page' : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  current ? 'bg-eagle-blue text-white' : 'text-charcoal hover:bg-warm-white'
                }`}
                href={href(page)}
                key={page}
              >
                {page}
              </Link>
            );
          })}
          {query.page < pageCount ? (
            <Link className="btn btn-secondary px-3 py-1.5" href={href(query.page + 1)}>
              Next
            </Link>
          ) : (
            <button className="btn btn-secondary px-3 py-1.5" disabled type="button">
              Next
            </button>
          )}
        </nav>
      ) : null}
    </div>
  );
};
