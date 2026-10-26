import type {RosterQuery} from '~/lib/roster-query';

export const RosterReturnFields = ({
  page,
  query,
  tab,
}: {
  page?: number;
  query: Pick<RosterQuery, 'page' | 'q' | 'role'>;
  tab?: string;
}) => {
  const returnPage = page ?? query.page;
  return (
    <>
      {tab ? <input name="tab" type="hidden" value={tab} /> : null}
      {query.q ? <input name="roster_q" type="hidden" value={query.q} /> : null}
      {query.role !== 'all' ? <input name="roster_role" type="hidden" value={query.role} /> : null}
      {returnPage > 1 ? (
        <input name="roster_page" type="hidden" value={String(returnPage)} />
      ) : null}
    </>
  );
};
