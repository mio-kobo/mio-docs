export type TutorialValidation = {
  type: 'stdout';
  /** Expected complete stdout, usually including the final newline written by chant. */
  expectedStdout: string;
};

/**
 * Compare tutorial stdout without making line-ending or final-newline choices
 * accidental failures. Internal blank lines and all other characters still
 * matter, so a wrong answer cannot pass by trimming arbitrary whitespace.
 */
export function normalizeTutorialStdout(value: string): string {
  return value.replace(/\r\n?/gu, '\n').replace(/\n+$/u, '');
}

export function matchesTutorialStdout(actual: string, expected: string): boolean {
  return normalizeTutorialStdout(actual) === normalizeTutorialStdout(expected);
}

export function passesTutorialValidation(validation: TutorialValidation, stdout: string): boolean {
  return validation.type === 'stdout' && matchesTutorialStdout(stdout, validation.expectedStdout);
}
