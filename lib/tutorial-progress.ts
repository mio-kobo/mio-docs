'use client';

import { useEffect, useState } from 'react';
import {
  loadTutorialProgress,
  TUTORIAL_PROGRESS_EVENT,
  type TutorialProgress,
} from './tutorial-storage';

/**
 * Returns null during SSR and the first client render, then hydrates from
 * localStorage. Progress UI can therefore render a stable placeholder rather
 * than guessing at server HTML.
 */
export function useTutorialProgress(): TutorialProgress | null {
  const [progress, setProgress] = useState<TutorialProgress | null>(null);

  useEffect(() => {
    let active = true;
    const update = () => {
      if (active) setProgress(loadTutorialProgress());
    };
    update();
    window.addEventListener('storage', update);
    window.addEventListener(TUTORIAL_PROGRESS_EVENT, update);
    return () => {
      active = false;
      window.removeEventListener('storage', update);
      window.removeEventListener(TUTORIAL_PROGRESS_EVENT, update);
    };
  }, []);

  return progress;
}
