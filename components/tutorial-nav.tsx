import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getNextTutorialLesson, getPreviousTutorialLesson } from '@/lib/tutorial-data';

const TUTORIAL_INDEX_HREF = '/docs/v2.0/tutorials';

export function TutorialNav({ lessonId }: { lessonId: string }) {
  const previous = getPreviousTutorialLesson(lessonId);
  const next = getNextTutorialLesson(lessonId);

  return <nav className="tutorial-nav not-prose" aria-label="教程课时导航">
    <Link className="tutorial-nav-link is-prev" href={previous?.href ?? TUTORIAL_INDEX_HREF}>
      <span><ArrowLeft size={14} aria-hidden="true" />上一课</span>
      <strong>{previous?.title ?? '教程首页'}</strong>
    </Link>
    <Link className="tutorial-nav-link is-next" href={next?.href ?? TUTORIAL_INDEX_HREF}>
      <span>下一课<ArrowRight size={14} aria-hidden="true" /></span>
      <strong>{next?.title ?? '返回教程首页'}</strong>
    </Link>
  </nav>;
}
