import type { TutorialValidation } from './tutorial-validation';

export type TutorialExercise = {
  id: string;
  lessonId: string;
  title: string;
  /** Shown in the exercise panel; the lesson prose provides the longer explanation. */
  instructions: string;
  starterCode: string;
  hints: readonly string[];
  validation: TutorialValidation;
};

export type TutorialLesson = {
  id: string;
  title: string;
  description: string;
  href: string;
  exercise: TutorialExercise;
};

/**
 * Stable lesson and exercise ids. They are persisted in localStorage, so do not
 * rename an id after publishing a lesson; add a migration if that becomes
 * unavoidable.
 */
export const TUTORIAL_LESSONS = [
  {
    id: 'hello-world',
    title: 'Hello World',
    description: '运行第一条 Mio 语句，认识字符串与标准输出。',
    href: '/docs/v2.0/tutorials/hello-world',
    exercise: {
      id: 'hello-world',
      lessonId: 'hello-world',
      title: '让 Mio 说出正确的问候',
      instructions: '把问候语改成 Hello, Mio!。程序成功运行且 stdout 与目标一致才算完成。',
      starterCode: 'chant("Hello, World!");\n',
      hints: [
        '字符串要放在英文双引号里。',
        '只改引号里的文本：把 Hello, World! 换成 Hello, Mio!。',
        '修改后点击“检查答案”，不要只点击“运行”。',
      ],
      validation: { type: 'stdout', expectedStdout: 'Hello, Mio!\n' },
    },
  },
  {
    id: 'variables',
    title: '变量',
    description: '用 kaku 保存一个整数，并让输出读取变量。',
    href: '/docs/v2.0/tutorials/variables',
    exercise: {
      id: 'variables',
      lessonId: 'variables',
      title: '改变变量的值',
      instructions: '把 count 的初始值改为 3，让程序输出 3。',
      starterCode: 'kaku count = 1;\nchant(count);\n',
      hints: [
        '声明变量使用 kaku 名称 = 值; 的形式。',
        '找到 kaku count = 1;，把 1 改成 3。',
        '保留 chant(count);，让输出读取变量而不是写死数字。',
      ],
      validation: { type: 'stdout', expectedStdout: '3\n' },
    },
  },
  {
    id: 'numbers',
    title: '数值计算',
    description: '用算术运算符组合变量，计算并输出结果。',
    href: '/docs/v2.0/tutorials/numbers',
    exercise: {
      id: 'numbers',
      lessonId: 'numbers',
      title: '用乘法得到 42',
      instructions: '用乘法计算 6 × 7，让程序输出 42。',
      starterCode: 'kaku a = 6;\nkaku b = 7;\nchant(a + b);\n',
      hints: [
        'Mio 的乘法运算符是 *。',
        '把 chant(a + b); 改成 chant(a * b);。',
        '修改后运行程序，确认输出为 42。',
      ],
      validation: { type: 'stdout', expectedStdout: '42\n' },
    },
  },
  {
    id: 'conditions',
    title: '条件分支',
    description: '用 moshi / sore 根据条件选择要执行的语句。',
    href: '/docs/v2.0/tutorials/conditions',
    exercise: {
      id: 'conditions',
      lessonId: 'conditions',
      title: '让分数通过',
      instructions: '把 score 改成至少 60 的整数，让程序只输出 passed。',
      starterCode: 'kaku score = 59;\nmoshi (score >= 60) {\n    chant("passed");\n} sore {\n    chant("failed");\n}\n',
      hints: [
        '分支条件是 score >= 60。',
        '把 kaku score = 59; 改成 60 或更大的整数。',
        '达到 60 后，moshi 分支会执行，sore 分支不会执行。',
      ],
      validation: { type: 'stdout', expectedStdout: 'passed\n' },
    },
  },
  {
    id: 'functions',
    title: '函数与返回值',
    description: '用 waza 定义函数，用参数传入值，用 kaesu 返回结果。',
    href: '/docs/v2.0/tutorials/functions',
    exercise: {
      id: 'functions',
      lessonId: 'functions',
      title: '补全 square 函数',
      instructions: '让 square 返回参数的平方，使 chant(square(7)); 输出 49。',
      starterCode: 'waza square(value: int64) -> int64 {\n    kaesu value;\n}\n\nchant(square(7));\n',
      hints: [
        '函数定义使用 waza，返回值使用 kaesu。',
        '平方就是 value 乘以自己。',
        '把 kaesu value; 改成 kaesu value * value;。',
      ],
      validation: { type: 'stdout', expectedStdout: '49\n' },
    },
  },
] as const satisfies readonly TutorialLesson[];

export type TutorialLessonId = (typeof TUTORIAL_LESSONS)[number]['id'];

export function getTutorialLesson(lessonId: string): TutorialLesson | undefined {
  return TUTORIAL_LESSONS.find(lesson => lesson.id === lessonId);
}

export function getTutorialExercise(exerciseId: string): { lesson: TutorialLesson; exercise: TutorialExercise } | undefined {
  for (const lesson of TUTORIAL_LESSONS) {
    if (lesson.exercise.id === exerciseId) return { lesson, exercise: lesson.exercise };
  }
  return undefined;
}

export function getPreviousTutorialLesson(lessonId: string): TutorialLesson | undefined {
  const index = TUTORIAL_LESSONS.findIndex(lesson => lesson.id === lessonId);
  return index > 0 ? TUTORIAL_LESSONS[index - 1] : undefined;
}

export function getNextTutorialLesson(lessonId: string): TutorialLesson | undefined {
  const index = TUTORIAL_LESSONS.findIndex(lesson => lesson.id === lessonId);
  return index >= 0 && index < TUTORIAL_LESSONS.length - 1 ? TUTORIAL_LESSONS[index + 1] : undefined;
}

export function isTutorialExerciseComplete(completedExerciseIds: readonly string[], exerciseId: string): boolean {
  return completedExerciseIds.includes(exerciseId);
}

export function isTutorialLessonComplete(completedExerciseIds: readonly string[], lesson: TutorialLesson): boolean {
  return isTutorialExerciseComplete(completedExerciseIds, lesson.exercise.id);
}

export const TUTORIAL_LESSON_COUNT = TUTORIAL_LESSONS.length;
