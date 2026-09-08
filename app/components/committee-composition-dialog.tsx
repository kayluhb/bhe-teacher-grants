'use client';

import {FormDialog} from '~/components/form-dialog';
import {COMMITTEE_NOTE, COMMITTEE_SEATS} from '~/lib/grant-process';

export const CommitteeCompositionDialog = () => (
  <FormDialog
    description={COMMITTEE_NOTE}
    title="Grant Committee composition"
    triggerClassName="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500 hover:border-eagle-blue hover:text-eagle-blue"
    triggerLabel={
      <>
        <span aria-hidden="true">?</span>
        <span className="sr-only">Grant Committee composition</span>
      </>
    }
  >
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-charcoal">Seat</th>
            <th className="px-4 py-2 text-left font-semibold text-charcoal">PTA Title</th>
            <th className="px-4 py-2 text-left font-semibold text-charcoal">Alternate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {COMMITTEE_SEATS.map((row, i) => (
            <tr key={row.seat}>
              <td className="px-4 py-2 font-medium text-charcoal">{i + 1}</td>
              <td className="px-4 py-2 text-gray-700">{row.pta_title}</td>
              <td className="px-4 py-2 text-gray-500">{row.alternates}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </FormDialog>
);
