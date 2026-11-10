'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { architectures, platforms, supportStatuses, type Architecture, type Platform, type SupportStatus } from '@/lib/platform-support';

// Local monochrome silhouettes; no network assets or icon font required.
const logos: Record<Platform, React.ReactNode> = {
  macos: <path d="M17.1 12.5c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.2-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8C7.8 7.7 6.4 8.6 5.6 10c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.2 1.3-2.4 1.3-2.5-.1 0-2.7-1-2.7-4.3ZM14.8 6.2c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1.1 2.9 1.1.1 2.2-.5 2.9-1.3Z" />,
  windows: <path d="M2 4.8 10.5 3.6v8H2Zm9.7-1.4L22 2v9.6H11.7ZM2 12.8h8.5v8L2 19.6Zm9.7 0H22v9.6L11.7 21Z" />,
  linux: <><path d="M8 8c0-4 1.5-6 4-6s4 2 4 6c0 2 1 3 2 5 1 2 1 4 0 5l-3 2H9l-3-2c-1-1-1-3 0-5 1-2 2-3 2-5Z" /><ellipse cx="12" cy="14" rx="3.5" ry="5" fill="var(--color-fd-background)" /><circle cx="10.5" cy="7" r="1" fill="var(--color-fd-background)" /><circle cx="13.5" cy="7" r="1" fill="var(--color-fd-background)" /><path d="m9 9 3-1 3 1-3 2ZM4 18l5 1 1 3-7-1Zm16 0-5 1-1 3 7-1Z" /></>,
};
export type PlatformBadgeProps = { system: Platform; status: SupportStatus; arch?: Architecture; note?: string };

// A hover must not leave the previous badge's keyboard tooltip covering it.
let dismissActiveDetail: (() => void) | undefined;

/** A button makes details available on touch, hover and keyboard focus. */
export function PlatformBadge({ system, status, arch, note }: PlatformBadgeProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const dismiss = useCallback(() => {
    if (dismissActiveDetail === dismiss) dismissActiveDetail = undefined;
    setOpen(false);
  }, []);
  useEffect(() => () => {
    if (dismissActiveDetail === dismiss) dismissActiveDetail = undefined;
  }, [dismiss]);

  function reveal() {
    if (dismissActiveDetail !== dismiss) dismissActiveDetail?.();
    dismissActiveDetail = dismiss;
    const rect = button.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - Math.min(288, window.innerWidth - 32) - 16)), top: Math.max(16, Math.min(rect.bottom, window.innerHeight - 160)) });
    setOpen(true);
  }
  const label = `${platforms[system].label}${arch ? ` ${architectures[arch].label}` : ''}：${supportStatuses[status].label}`;
  return <span className={`platform-badge-wrap platform-status-${status}`} onMouseEnter={reveal} onMouseLeave={() => { if (document.activeElement !== button.current) dismiss(); }}>
    <button ref={button} type="button" className="platform-badge" aria-label={label} aria-describedby={id} aria-expanded={open} onFocus={reveal} onClick={reveal} onBlur={dismiss} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">{logos[system]}</svg>
      {arch && <span>{architectures[arch].label}</span>}<span aria-hidden="true">{supportStatuses[status].symbol}</span>
    </button>
    <span id={id} role="tooltip" className="platform-badge-detail" hidden={!open} style={{ ...position, maxHeight: `min(18rem, calc(100dvh - ${position.top + 16}px))` }}>{label}{note && ` · ${note}`}</span>
  </span>;
}
