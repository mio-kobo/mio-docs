/** Author-facing Frontmatter values; labels do not imply release acceptance. */
export const featureBadges = {
  new: { label: 'NEW', meaning: '新增功能' },
  updated: { label: 'UPDATED', meaning: '功能已更新' },
  experimental: { label: 'BETA', meaning: '实验性功能' },
  deprecated: { label: 'DEPRECATED', meaning: '功能已弃用' },
} as const;

export type FeatureBadge = keyof typeof featureBadges;

export function isFeatureBadge(value: unknown): value is FeatureBadge {
  return typeof value === 'string' && Object.hasOwn(featureBadges, value);
}
