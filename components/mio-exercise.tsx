'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CircleCheck,
  Lightbulb,
  LoaderCircle,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Terminal,
} from 'lucide-react';
import { runMio, type MioResult } from '@/lib/mio-runtime';
import { getNextTutorialLesson, getTutorialExercise } from '@/lib/tutorial-data';
import {
  clearTutorialDraft,
  loadTutorialProgress,
  markTutorialExerciseComplete,
  saveTutorialDraft,
  setTutorialLastLesson,
} from '@/lib/tutorial-storage';
import { passesTutorialValidation } from '@/lib/tutorial-validation';
import { MioResultPanel } from './mio-result-panel';

export interface MioExerciseProps {
  exerciseId: string;
  /** Build-time Shiki output for the untouched starter code. */
  highlightedStarter: ReactNode;
}

const EMPTY_RESULT: Omit<MioResult, 'status'> = {
  stdout: '',
  diagnostics: [],
  compileMs: 0,
  runMs: 0,
};

type PendingOperation = 'run' | 'check';
type CheckState = 'passed' | 'failed' | null;

export function MioExercise({ exerciseId, highlightedStarter }: MioExerciseProps) {
  const entry = getTutorialExercise(exerciseId);
  if (!entry) throw new Error(`Unknown tutorial exercise: ${exerciseId}`);
  const { lesson, exercise } = entry;
  const nextLesson = getNextTutorialLesson(lesson.id);
  const nextHref = nextLesson?.href ?? '/docs/v2.0/tutorials';
  const nextLabel = nextLesson ? `下一课：${nextLesson.title}` : '返回教程首页';

  const [code, setCode] = useState(exercise.starterCode);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<PendingOperation | null>(null);
  const [result, setResult] = useState<MioResult | null>(null);
  const [checkState, setCheckState] = useState<CheckState>(null);
  const [completed, setCompleted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);
  const mountedRef = useRef(true);

  const dirty = code !== exercise.starterCode;
  const sourceRows = Math.min(22, Math.max(8, code.split('\n').length + 1));
  const allHintsShown = hintsShown >= exercise.hints.length;

  useEffect(() => {
    mountedRef.current = true;
    const progress = loadTutorialProgress();
    const draft = progress.drafts[exercise.id];
    if (typeof draft === 'string' && draft !== exercise.starterCode) {
      setCode(draft);
      setEditing(true);
    }
    setCompleted(progress.completedExerciseIds.includes(exercise.id));
    setTutorialLastLesson(lesson.id);
    setHydrated(true);

    return () => {
      mountedRef.current = false;
      requestTokenRef.current++;
      controllerRef.current?.abort();
    };
  }, [exercise.id, exercise.starterCode, lesson.id]);

  useEffect(() => {
    if (!hydrated) return;
    if (code === exercise.starterCode) {
      clearTutorialDraft(exercise.id);
    } else {
      saveTutorialDraft(exercise.id, code);
    }
  }, [code, exercise.id, exercise.starterCode, hydrated]);

  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  async function execute(operation: PendingOperation) {
    if (pending) return;
    const token = ++requestTokenRef.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setPending(operation);
    setResult(null);
    setCheckState(null);

    try {
      const nextResult = await runMio(code, { signal: controller.signal });
      if (!mountedRef.current || token !== requestTokenRef.current) return;
      setResult(nextResult);

      if (operation === 'check' && nextResult.status === 'ok') {
        const passed = passesTutorialValidation(exercise.validation, nextResult.stdout);
        if (passed) {
          setCheckState('passed');
          setCompleted(true);
          markTutorialExerciseComplete(exercise.id, lesson.id);
        } else {
          setCheckState('failed');
        }
      }
      setPending(null);
    } catch (error) {
      if (!mountedRef.current || token !== requestTokenRef.current) return;
      setResult({
        ...EMPTY_RESULT,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        failureKind: 'internal',
      });
      setPending(null);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function stop() {
    if (!pending) return;
    requestTokenRef.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPending(null);
    setCheckState(null);
    setResult({
      ...EMPTY_RESULT,
      status: 'error',
      error: '执行已停止，Worker 已终止。',
      failureKind: 'cancelled',
    });
  }

  function reset() {
    if (pending) return;
    requestTokenRef.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setCode(exercise.starterCode);
    setEditing(false);
    setResult(null);
    setCheckState(null);
    setHintsShown(0);
    clearTutorialDraft(exercise.id);
  }

  function showNextHint() {
    setHintsShown(count => Math.min(count + 1, exercise.hints.length));
  }

  function toggleEditing() {
    if (pending) return;
    setEditing(value => !value);
  }

  return <section className={`mio-exercise not-prose${completed ? ' is-complete' : ''}`} aria-labelledby={`${exercise.id}-exercise-title`}>
    <div className="mio-exercise-header">
      <div>
        <span className="mio-exercise-kicker">练习 · {lesson.title}</span>
        <h2 id={`${exercise.id}-exercise-title`}>{exercise.title}</h2>
      </div>
      {completed && <span className="mio-exercise-status">
        <CircleCheck size={15} aria-hidden="true" />
        已完成
      </span>}
    </div>

    <p className="mio-exercise-instructions">{exercise.instructions}</p>

    <CodeBlock
      title={<span className="mio-playground-title">练习代码<span className="mio-playground-badge">Exercise</span></span>}
      icon={<Terminal size={15} aria-hidden="true" />}
      allowCopy={false}
      className="mio-exercise-code"
      viewportProps={{ 'aria-label': editing ? '练习代码编辑器' : '练习代码' }}
    >
      {editing
        ? <textarea
            ref={editorRef}
            className="mio-playground-editor"
            aria-label="编辑 Mio 练习代码"
            value={code}
            rows={sourceRows}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            onChange={event => {
              setCode(event.target.value);
              setResult(null);
              setCheckState(null);
            }}
          />
        : dirty
          ? <Pre><code>{code}</code></Pre>
          : highlightedStarter}
    </CodeBlock>

    <div className="mio-exercise-toolbar" role="group" aria-label="Mio 练习操作">
      <div className="mio-playground-actions">
        <button type="button" className="mio-action" onClick={() => void execute('run')} disabled={pending !== null}>
          {pending === 'run' ? <LoaderCircle className="mio-spin" size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          {pending === 'run' ? '运行中' : '运行'}
        </button>
        <button type="button" className="mio-action is-primary" onClick={() => void execute('check')} disabled={pending !== null}>
          {pending === 'check' ? <LoaderCircle className="mio-spin" size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
          {pending === 'check' ? '检查中' : '检查答案'}
        </button>
        <button type="button" className="mio-action is-stop" onClick={stop} disabled={pending === null} aria-label="停止执行并终止 Worker">
          <Square size={13} aria-hidden="true" />
          停止
        </button>
      </div>
      <div className="mio-playground-tools">
        <button type="button" className="mio-tool" onClick={showNextHint} disabled={allHintsShown}>
          <Lightbulb size={14} aria-hidden="true" />
          {allHintsShown ? '提示已显示' : hintsShown > 0 ? '再提示' : '提示'}
        </button>
        <button type="button" className="mio-tool" onClick={toggleEditing} disabled={pending !== null}>
          {editing ? <Check size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
          {editing ? '完成编辑' : '编辑代码'}
        </button>
        <button type="button" className="mio-tool" onClick={reset} disabled={pending !== null || (!dirty && !result && !editing && hintsShown === 0 && !checkState)}>
          <RotateCcw size={14} aria-hidden="true" />
          重置
        </button>
      </div>
    </div>

    {hintsShown > 0 && <div className="mio-exercise-hints" aria-live="polite" aria-label="渐进提示">
      <div className="mio-exercise-hints-title">
        <Lightbulb size={14} aria-hidden="true" />
        <span>提示</span>
        <span>{hintsShown} / {exercise.hints.length}</span>
      </div>
      <ol>
        {exercise.hints.slice(0, hintsShown).map((hint, index) => <li key={hint}>
          <span aria-hidden="true">{index + 1}</span>
          <p>{hint}</p>
        </li>)}
      </ol>
    </div>}

    <div className="mio-exercise-live" aria-live="polite">
      {pending && <div className="mio-pending" aria-busy="true">
        <LoaderCircle className="mio-spin" size={15} aria-hidden="true" />
        <span>{pending === 'run' ? '正在编译并运行 Mio…' : '正在执行并检查 stdout…'}</span>
      </div>}
      {!pending && result && <MioResultPanel result={result} label="练习运行结果" />}
      {!pending && checkState === 'failed' && <div className="mio-validation is-failed" role="status">
        <AlertCircle size={16} aria-hidden="true" />
        <div>
          <strong>尚未通过</strong>
          <p>程序运行成功，但 stdout 与目标不一致。对照练习目标检查变量值、运算符或输出语句。</p>
        </div>
      </div>}
      {!pending && checkState === 'passed' && <>
        <div className="mio-validation is-passed" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          <div>
            <strong>练习通过</strong>
            <p>stdout 与目标一致，完成进度已保存在当前浏览器。</p>
          </div>
        </div>
        <Link className="mio-exercise-next" href={nextHref}>
          {nextLabel}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </>}
      {!pending && !result && !checkState && !completed && <p className="mio-exercise-placeholder">
        运行或检查答案后，这里会显示真实 stdout、编译诊断与运行时错误。
      </p>}
      {completed && checkState !== 'passed' && <p className="mio-exercise-completed-note">
        此练习此前已完成。你仍可以修改代码、重新运行或再次检查。
      </p>}
    </div>
  </section>;
}
