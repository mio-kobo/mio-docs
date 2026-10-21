'use client';

export function SkipLink() {
  return <a className="skip-link" href="#main-content" onClick={() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.tabIndex = -1;
    main.focus({ preventScroll: true });
  }}>跳转到主要内容</a>;
}
