'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { versionNoticeKey } from './docs-shell';
export function VersionNotice() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<{target:string;version:string;chapter:string} | null>(null);
  useEffect(() => {
    setNotice(null);
    try {
      const text = sessionStorage.getItem(versionNoticeKey);
      if (!text) return;
      const candidate = JSON.parse(text);
      if (candidate.target === pathname) { setNotice(candidate); sessionStorage.removeItem(versionNoticeKey); }
    } catch { /* Optional feedback must not block documentation. */ }
  }, [pathname]);
  if (!notice) return null;
  return <div className="version-feedback" role="status"><p>{notice.version} 没有对应章节「{notice.chapter}」，已返回该版本首页。</p><button onClick={() => setNotice(null)} aria-label="关闭版本切换提示">关闭</button></div>;
}
