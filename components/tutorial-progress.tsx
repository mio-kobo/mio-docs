'use client';

import { isTutorialLessonComplete, TUTORIAL_LESSONS } from '@/lib/tutorial-data';
import { useTutorialProgress } from '@/lib/tutorial-progress';

export function TutorialProgress({ lessonId }: { lessonId?: string }) {
  const progress = useTutorialProgress();
  const total = TUTORIAL_LESSONS.length;
  const completed = progress
    ? TUTORIAL_LESSONS.filter(lesson => isTutorialLessonComplete(progress.completedExerciseIds, lesson)).length
    : 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const currentLesson = lessonId ? TUTORIAL_LESSONS.find(lesson => lesson.id === lessonId) : undefined;
  const currentComplete = Boolean(progress && currentLesson && isTutorialLessonComplete(progress.completedExerciseIds, currentLesson));

  let note = '正在读取当前浏览器中的学习进度…';
  if (progress) {
    if (completed === total) note = '全部练习已完成。进度保存在当前浏览器中。';
    else if (completed === 0) note = '完成练习后，进度会保存在当前浏览器中。';
    else note = `已完成 ${completed} 个练习。进度保存在当前浏览器中。`;
    if (currentLesson) note += currentComplete ? ' 本课已完成。' : ' 本课尚未完成。';
  }

  return <section className="tutorial-progress not-prose" aria-label="教程进度">
    <div className="tutorial-progress-heading">
      <span>课程进度</span>
      <strong>{completed} / {total}</strong>
    </div>
    <div
      className="tutorial-progress-track"
      role="progressbar"
      aria-label={`已完成 ${completed} / ${total} 个练习`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={completed}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
    <p aria-live="polite">{note}</p>
  </section>;
}
