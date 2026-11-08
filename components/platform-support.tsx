import { PlatformBadge } from './platform-badge';
import { architectures, platforms, summarizeSupport, supportEntry, supportStatuses, type Architecture, type Platform, type PlatformSupportConfig } from '@/lib/platform-support';

export function PlatformSupport({ systems, showArch = false }: PlatformSupportConfig) {
  const badges = (Object.keys(platforms) as Platform[]).flatMap(system => {
    const entries = (Object.keys(architectures) as Architecture[]).flatMap(arch => {
      const entry = systems[system]?.[arch];
      return entry ? [{ arch, ...supportEntry(entry) }] : [];
    });
    if (!entries.length) return [];
    if (showArch) return entries.map(({ arch, status, note }) => <PlatformBadge key={`${system}-${arch}`} system={system} arch={arch} status={status} note={note} />);
    const missing = (Object.keys(architectures) as Architecture[]).filter(arch => !systems[system]?.[arch]);
    const note = entries.map(({ arch, status, note }) => `${arch}：${supportStatuses[status].label}${note ? `（${note}）` : ''}`).join('；') + (missing.length ? `；${missing.join('、')}：未配置，未验证` : '') + '。仅依据已配置架构。';
    return [<PlatformBadge key={system} system={system} status={summarizeSupport([...entries, ...missing.map(() => 'unknown' as const)])} note={note} />];
  });
  return badges.length ? <span className="platform-support" aria-label="平台兼容性">{badges}</span> : null;
}
