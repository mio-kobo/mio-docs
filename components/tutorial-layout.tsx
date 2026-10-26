import type { ReactNode } from 'react';

/** Lesson prose on the left; the live exercise stays visible on the right. */
export function TutorialLayout({ children, exercise }: { children: ReactNode; exercise: ReactNode }) {
  return <div className="tutorial-layout" data-tutorial-layout="">
    <div className="tutorial-content">{children}</div>
    <aside className="tutorial-practice" aria-label="本课练习">{exercise}</aside>
  </div>;
}
