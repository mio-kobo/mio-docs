import { getHighlighter, highlight } from 'fumadocs-core/highlight';
import { Pre } from 'fumadocs-ui/components/codeblock';
import mio from '@/syntaxes/mio.tmLanguage.json';
import { getTutorialExercise } from '@/lib/tutorial-data';
import { MioExercise } from './mio-exercise';

/**
 * MDX boundary for an exercise. Highlighting happens at build time with the
 * same pinned grammar as fenced code blocks, then the interactive state lives in
 * the client component.
 */
export async function MioExerciseBlock({ exerciseId }: { exerciseId: string }) {
  const entry = getTutorialExercise(exerciseId);
  if (!entry) throw new Error(`Unknown tutorial exercise: ${exerciseId}`);

  await getHighlighter('js', { langs: [{ ...mio, name: 'mio', aliases: ['Mio'] }] });
  const highlightedStarter = await highlight(entry.exercise.starterCode, {
    lang: 'mio',
    defaultColor: false,
    themes: { light: 'github-light', dark: 'github-dark' },
    components: { pre: props => <Pre {...props} /> },
  });

  return <MioExercise exerciseId={exerciseId} highlightedStarter={highlightedStarter} />;
}
