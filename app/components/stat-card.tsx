export const StatCard = ({
  hint,
  label,
  tone = 'default',
  value,
}: {
  hint?: string;
  label: string;
  tone?: 'default' | 'gold' | 'green' | 'red';
  value: string;
}) => {
  const tones = {
    default: 'border-gray-200',
    gold: 'border-spirit-gold/40',
    green: 'border-creek-green/40',
    red: 'border-red-200',
  };

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${tones[tone]}`}>
      <p className="font-body text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      <p className="font-heading mt-1 text-2xl font-bold tabular-nums text-charcoal">{value}</p>
      {hint ? <p className="font-body mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
};
