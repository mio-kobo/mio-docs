'use client';

export type TutorialProgress = {
  completedExerciseIds: string[];
  lastLessonId: string | null;
  /** Draft source keyed by stable exercise id. */
  drafts: Record<string, string>;
};

export const TUTORIAL_PROGRESS_STORAGE_KEY = 'mio-tutorial-progress-v1';
export const TUTORIAL_PROGRESS_EVENT = 'mio-tutorial-progress-change';

const MAX_ID_LENGTH = 128;
const MAX_DRAFT_LENGTH = 64 * 1024;
const MAX_DRAFTS = 64;

function emptyProgress(): TutorialProgress {
  return { completedExerciseIds: [], lastLessonId: null, drafts: {} };
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function sanitizeProgress(value: unknown): TutorialProgress {
  if (!value || typeof value !== 'object') return emptyProgress();
  const raw = value as Record<string, unknown>;

  const completedExerciseIds: string[] = [];
  if (Array.isArray(raw.completedExerciseIds)) {
    for (const id of raw.completedExerciseIds) {
      if (typeof id !== 'string' || !id || id.length > MAX_ID_LENGTH) continue;
      if (!completedExerciseIds.includes(id)) completedExerciseIds.push(id);
    }
  }

  const lastLessonId = typeof raw.lastLessonId === 'string' && raw.lastLessonId && raw.lastLessonId.length <= MAX_ID_LENGTH
    ? raw.lastLessonId
    : null;

  const drafts: Record<string, string> = {};
  if (raw.drafts && typeof raw.drafts === 'object' && !Array.isArray(raw.drafts)) {
    for (const [id, code] of Object.entries(raw.drafts)) {
      if (Object.keys(drafts).length >= MAX_DRAFTS) break;
      if (!id || id.length > MAX_ID_LENGTH || typeof code !== 'string' || code.length > MAX_DRAFT_LENGTH) continue;
      drafts[id] = code;
    }
  }

  return { completedExerciseIds, lastLessonId, drafts };
}

function notifyProgressChanged(): void {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(TUTORIAL_PROGRESS_EVENT));
  } catch {
    // Progress remains usable when custom events or storage are restricted.
  }
}

function writeProgress(progress: TutorialProgress, notify: boolean): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Quota or privacy-mode failures must not break an exercise.
    }
  }
  if (notify) notifyProgressChanged();
}

export function loadTutorialProgress(): TutorialProgress {
  const storage = getStorage();
  if (!storage) return emptyProgress();
  try {
    const raw = storage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function markTutorialExerciseComplete(exerciseId: string, lessonId: string): TutorialProgress {
  const progress = loadTutorialProgress();
  const alreadyComplete = progress.completedExerciseIds.includes(exerciseId);
  const lessonChanged = progress.lastLessonId !== lessonId;
  if (!alreadyComplete) progress.completedExerciseIds.push(exerciseId);
  progress.lastLessonId = lessonId;
  if (!alreadyComplete || lessonChanged) writeProgress(progress, true);
  return progress;
}

export function setTutorialLastLesson(lessonId: string): TutorialProgress {
  const progress = loadTutorialProgress();
  if (progress.lastLessonId === lessonId) return progress;
  progress.lastLessonId = lessonId;
  writeProgress(progress, true);
  return progress;
}

export function saveTutorialDraft(exerciseId: string, code: string): void {
  if (!exerciseId || exerciseId.length > MAX_ID_LENGTH || code.length > MAX_DRAFT_LENGTH) return;
  const progress = loadTutorialProgress();
  if (progress.drafts[exerciseId] === code) return;
  progress.drafts[exerciseId] = code;
  // Keystrokes persist locally but do not need to rerender progress indicators.
  writeProgress(progress, false);
}

export function clearTutorialDraft(exerciseId: string): void {
  const progress = loadTutorialProgress();
  if (!(exerciseId in progress.drafts)) return;
  delete progress.drafts[exerciseId];
  writeProgress(progress, false);
}
