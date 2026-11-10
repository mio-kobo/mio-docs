import { featureBadges, isFeatureBadge, type FeatureBadge as FeatureBadgeValue } from '@/lib/feature-badge';

type FeatureBadgeProps = {
  since?: string;
  compact?: boolean;
} & (
  | { status: FeatureBadgeValue; value?: never }
  | { value?: FeatureBadgeValue; status?: never }
);

export function FeatureBadge({ status, value = status, since, compact = false }: FeatureBadgeProps) {
  if (status !== undefined && !isFeatureBadge(status)) throw new Error(`Invalid FeatureBadge status: ${status}`);
  if (!isFeatureBadge(value)) return null;
  const { label, meaning } = featureBadges[value];
  return <span className={`feature-badge feature-badge-${value}${compact ? ' feature-badge-compact' : ''}`} aria-label={`${label}：${meaning}${since ? ` · ${since}` : ''}`}>{label}{since && <span className="feature-badge-since">{since}</span>}</span>;
}
