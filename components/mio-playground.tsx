'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import {
  Check,
  Copy,
  LoaderCircle,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Terminal,
} from 'lucide-react';
import { checkMio, runMio, type MioOperation, type MioResult } from '@/lib/mio-runtime';
import { MioResultPanel } from './mio-result-panel';

export interface MioPlaygroundProps {
  source: string;
  title?: string;
  icon?: string;
  highlighted?: ReactNode;
  className?: string;
}

const EMPTY_RESULT: Omit<MioResult, 'status'> = {
  stdout: '',
  diagnostics: [],
  compileMs: 0,
  runMs: 0,
};

export function MioPlayground({ source, title, icon, highlighted, className }: MioPlaygroundProps) {
  const [code, setCode] = useState(source);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<MioOperation | null>(null);
  const [result, setResult] = useState<MioResult | null>(null);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayTitle = title || 'Mio';
  const dirty = code !== source;
  const sourceRows = Math.min(24, Math.max(8, code.split('\n').length + 1));

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller) controller.abort();
    controllerRef.current = null;
    requestTokenRef.current++;
    setCode(source);
    setEditing(false);
    setPending(null);
    setResult(null);
  }, [source]);

  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestTokenRef.current++;
      controllerRef.current?.abort();
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function execute(operation: MioOperation) {
    if (pending) return;
    const token = ++requestTokenRef.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setPending(operation);
    setResult(null);

    try {
      const nextResult = operation === 'run'
        ? await runMio(code, { signal: controller.signal })
        : await checkMio(code, { signal: controller.signal });

      if (!mountedRef.current || token !== requestTokenRef.current) return;
      setResult(nextResult);
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
    setCode(source);
    setEditing(false);
    setResult(null);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        textarea.remove();
      }
    }
    if (!mountedRef.current) return;
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setCopied(false);
    }, 1600);
  }

  function toggleEditing() {
    if (pending) return;
    setEditing(value => !value);
  }

  return <div className={`mio-playground${className ? ` ${className}` : ''}`} data-mio-playground="">
    <CodeBlock
      title={<span className="mio-playground-title">{displayTitle}<span className="mio-playground-badge">Playground</span></span>}
      icon={icon}
      allowCopy={false}
      className="mio-playground-code"
      viewportProps={{ 'aria-label': editing ? `${displayTitle} 源码编辑器` : `${displayTitle} 源码` }}
    >
      {editing
        ? <textarea
            ref={editorRef}
            className="mio-playground-editor"
            aria-label="Mio 源码编辑"
            value={code}
            rows={sourceRows}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            onChange={event => setCode(event.target.value)}
          />
        : <Pre>{highlighted && !dirty ? highlighted : <code>{code}</code>}</Pre>}
    </CodeBlock>

    <div className="mio-playground-toolbar" role="group" aria-label="Mio Playground 操作">
      <div className="mio-playground-actions">
        <button type="button" className="mio-action is-primary" onClick={() => void execute('run')} disabled={pending !== null}>
          {pending === 'run' ? <LoaderCircle className="mio-spin" size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          {pending === 'run' ? '运行中' : '运行'}
        </button>
        <button type="button" className="mio-action" onClick={() => void execute('check')} disabled={pending !== null}>
          {pending === 'check' ? <LoaderCircle className="mio-spin" size={15} aria-hidden="true" /> : <Terminal size={15} aria-hidden="true" />}
          {pending === 'check' ? '检查中' : '检查'}
        </button>
        <button type="button" className="mio-action is-stop" onClick={stop} disabled={pending === null} aria-label="停止执行并终止 Worker">
          <Square size={13} aria-hidden="true" />
          停止
        </button>
      </div>
      <div className="mio-playground-tools">
        <button type="button" className="mio-tool" onClick={() => void copyCode()}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? '已复制' : '复制'}
        </button>
        <button type="button" className="mio-tool" onClick={toggleEditing} disabled={pending !== null}>
          {editing ? <Check size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
          {editing ? '完成' : '编辑'}
        </button>
        <button type="button" className="mio-tool" onClick={reset} disabled={pending !== null || (!dirty && !result && !editing)}>
          <RotateCcw size={14} aria-hidden="true" />
          重置
        </button>
      </div>
    </div>

    <div className="mio-playground-live" aria-live="polite">
      {pending && <div className="mio-pending" aria-busy="true">
        <LoaderCircle className="mio-spin" size={15} aria-hidden="true" />
        <span>{pending === 'run' ? '正在编译并运行 Mio…' : '正在检查 Mio…'}</span>
      </div>}
      {!pending && result && <MioResultPanel result={result} />}
    </div>
  </div>;
}
