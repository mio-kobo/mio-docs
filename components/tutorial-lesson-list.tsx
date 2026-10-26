'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { isTutorialLessonComplete, TUTORIAL_LESSONS } from '@/lib/tutorial-data';
import { useTutorialProgress } from '@/lib/tutorial-progress';

export function TutorialLessonList() {
  const progress = useTutorialProgress();

  return <ol className="tutorial-lesson-list not-prose" aria-label="交互式教程课程">
    {TUTORIAL_LESSONS.map((lesson, index) => {
      const done = progress ? isTutorialLessonComplete(progress.completedExerciseIds, lesson) : false;
      const current = Boolean(progress?.lastLessonId === lesson.id);
      return <li key={lesson.id}>
        <Link
          href={lesson.href}
          className={`tutorial-lesson-card${done ? ' is-complete' : ''}${current ? ' is-current' : ''}`}
          aria-current={current ? 'step' : undefined}
        >
          <span className="tutorial-lesson-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="tutorial-lesson-copy">
            <strong>{lesson.title}</strong>
            <span>{lesson.description}</span>
          </span>
          <span className="tutorial-lesson-state">
            {done
              ? <><CircleCheck size={15} aria-hidden="true" />已完成</>
              : <>{current ? '继续' : '开始'}<ArrowRight size={15} aria-hidden="true" /></>}
          </span>
        </Link>
      </li>;
    })}
  </ol>;
}
