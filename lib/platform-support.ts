/** Extend these registries (and the logo map) to add platforms or architectures. */
export const platforms = { macos: { label: 'macOS' }, windows: { label: 'Windows' }, linux: { label: 'Linux' } } as const;
export const architectures = { arm64: { label: 'arm64' }, x86_64: { label: 'x86_64' } } as const;
export const supportStatuses = {
  full: { label: '完整支持', symbol: '✓' },
  partial: { label: '部分支持', symbol: '◐' },
  unsupported: { label: '不支持', symbol: '×' },
  unknown: { label: '未验证', symbol: '?' },
} as const;
export type Platform = keyof typeof platforms;
export type Architecture = keyof typeof architectures;
export type SupportStatus = keyof typeof supportStatuses;
export type SupportEntry = SupportStatus | { status: SupportStatus; note?: string };
export type PlatformSupportConfig = {
  showArch?: boolean;
  systems: Partial<Record<Platform, Partial<Record<Architecture, SupportEntry>>>>;
};
export function supportEntry(entry: SupportEntry) {
  return typeof entry === 'string' ? { status: entry } : entry;
}
/** Unknown evidence stays unknown; only unanimous full evidence is full. */
export function summarizeSupport(entries: SupportEntry[]): SupportStatus {
  const statuses = entries.map(entry => supportEntry(entry).status);
  if (!statuses.length || statuses.includes('unknown')) return 'unknown';
  if (statuses.every(status => status === statuses[0])) return statuses[0];
  return 'partial';
}
