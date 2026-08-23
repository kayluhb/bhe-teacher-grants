import {BENEFIT_SCOPE_DESCRIPTIONS, BENEFIT_SCOPE_LABELS} from '~/lib/grant-application';
import type {GrantRow} from '~/lib/types';
import {wishlistRetailerLabel} from '~/lib/wishlist';

export const GrantNarrative = ({grant}: {grant: GrantRow}) => {
  const retailer = grant.wishlist_url ? wishlistRetailerLabel(grant.wishlist_url) : null;
  const grades = grant.grade_level_subject.trim();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid md:grid-cols-[1.4fr_1fr]">
        <section className="border-b border-gray-100 p-5 md:border-r md:border-b-0">
          <h2 className="font-body text-[11px] font-semibold tracking-[0.16em] text-gray-500 uppercase">
            Description
          </h2>
          <p className="font-body mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal">
            {grant.impact_statement}
          </p>
        </section>
        <section className="bg-warm-white/80 p-5">
          <h2 className="font-body text-[11px] font-semibold tracking-[0.16em] text-gray-500 uppercase">
            Who it benefits
          </h2>
          <p className="font-heading mt-2 text-lg font-semibold text-charcoal">
            {BENEFIT_SCOPE_LABELS[grant.benefit_scope]}
          </p>
          {grades ? <p className="font-body mt-0.5 text-sm text-charcoal">{grades}</p> : null}
          <p className="font-body mt-2 text-sm leading-relaxed text-gray-600">
            {BENEFIT_SCOPE_DESCRIPTIONS[grant.benefit_scope]}
          </p>
          {grant.wishlist_url ? (
            <a
              className="btn btn-brand mt-4"
              href={grant.wishlist_url}
              rel="noopener"
              target="_blank"
            >
              Open {retailer ? `${retailer} wishlist` : 'wishlist'} (opens in a new tab)
            </a>
          ) : null}
        </section>
      </div>
    </div>
  );
};
