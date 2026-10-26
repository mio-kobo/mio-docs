'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import {
  getTutorialLesson,
  isTutorialLessonComplete,
  TUTORIAL_LESSONS,
} from '@/lib/tutorial-data';
import { useTutorialProgress } from '@/lib/tutorial-progress';

export function ContinueLearning() {
  const progress = useTutorialProgress();
  const completed = progress
    ? progress.completedExerciseIds
    : [];
  const allComplete = Boolean(progress) && TUTORIAL_LESSONS.every(lesson => isTutorialLessonComplete(completed, lesson));
  const lastLesson = progress?.lastLessonId ? getTutorialLesson(progress.lastLessonId) : undefined;
  const firstIncomplete = TUTORIAL_LESSONS.find(lesson => !isTutorialLessonComplete(completed, lesson));
  const target = allComplete
    ? TUTORIAL_LESSONS[0]
    : lastLesson && !isTutorialLessonComplete(completed, lastLesson)
      ? lastLesson
      : firstIncomplete ?? TUTORIAL_LESSONS[0];

  const kicker = allComplete ? '全部课程已完成' : progress ? '继续学习' : '开始学习';
  const action = allComplete ? '重新开始' : !progress ? '开始第一课' : lastLesson?.id === target.id ? '继续本课' : '继续下一课';

  return <Link className="tutorial-continue not-prose" href={target.href}>
    <span className="tutorial-continue-icon" aria-hidden="true">
      {allComplete ? <CircleCheck size={19} /> : <ArrowRight size={19} />}
    </span>
    <span className="tutorial-continue-copy">
      <span>{kicker}</span>
      <strong>{target.title}</strong>
      <small>{target.description}</small>
    </span>
    <span className="tutorial-continue-action">{action}</span>
  </Link>;
}
