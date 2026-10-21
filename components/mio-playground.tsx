'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import {
  AlertCircle,
  Check,
  CircleCheck,
  Copy,
  LoaderCircle,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Terminal,
} from 'lucide-react';
import { checkMio, runMio, type MioFailureKind, type MioOperation, type MioResult } from '@/lib/mio-runtime';

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

function formatMs(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value < 1) return `${value.toFixed(2)} ms`;
  return `${value.toFixed(1)} ms`;
}

function resultLabel(result: MioResult): string {
  if (result.status === 'ok') return '运行成功';
  if (result.status === 'checked') return '检查通过';
  if (result.status === 'diagnostic') return '编译诊断';
  if (result.failureKind === 'cancelled') return '已停止';
  if (result.failureKind === 'timeout') return '执行超时';
  if (result.failureKind === 'load') return 'WASM 加载失败';
  if (result.failureKind === 'queue') return '请求过多';
  if (result.failureKind === 'limit') return '超出限制';
  return '运行时错误';
}

function resultIcon(result: MioResult) {
  if (result.status === 'ok' || result.status === 'checked') return <CircleCheck size={15} aria-hidden="true" />;
  return <AlertCircle size={15} aria-hidden="true" />;
}

function ResultPanel({ result }: { result: MioResult }) {
  const hasStdout = result.stdout.length > 0;
  const isDiagnostic = result.status === 'diagnostic';
  const isError = result.status === 'error';
  const failureKind: MioFailureKind | undefined = result.failureKind;
  const showLoadHint = failureKind === 'load';
  const showCompileTiming = result.status !== 'error' || result.compileMs > 0;

  return <section className={`mio-result is-${result.status}${isError ? ' is-error' : ''}`} aria-label="Mio Playground 结果">
    <div className="mio-result-heading">
      <span>{resultIcon(result)}</span>
      <h3>{resultLabel(result)}</h3>
      {showCompileTiming && <span className="mio-result-timing">
        {result.status === 'checked' && <>编译 {formatMs(result.compileMs)} · 未执行</>}
        {result.status !== 'checked' && <>编译 {formatMs(result.compileMs)}</>}
        {result.status === 'ok' && <> · 执行 {formatMs(result.runMs)}</>}
        {result.status === 'error' && result.runMs > 0 && <> · 执行 {formatMs(result.runMs)}</>}
      </span>}
    </div>

    {result.status === 'ok' && (hasStdout
      ? <pre className="mio-result-stdout" aria-label="标准输出">{result.stdout}</pre>
      : <p className="mio-result-empty">（程序没有输出）</p>)}

    {result.status === 'checked' && <p className="mio-result-note">语法与类型检查通过；未执行任何 Mio 代码。</p>}

    {isDiagnostic && <div className="mio-diagnostics" aria-label="编译诊断">
      {result.diagnostics.length
        ? result.diagnostics.map((diagnostic, index) => <pre className="mio-diagnostic" key={`${index}-${diagnostic.slice(0, 24)}`}>{diagnostic}</pre>)
        : <p className="mio-result-note">编译器返回了诊断状态，但没有提供诊断文本。</p>}
    </div>}

    {isError && <div className="mio-result-error">
      <pre>{result.error || 'Mio 运行时返回了未知错误。'}</pre>
      {showLoadHint && <p>请确认部署后的 <code>/wasm/mio.wasm</code> 与 <code>/wasm/wasm_exec.js</code> 可以访问。</p>}
      {failureKind === 'timeout' && <p>执行超时后 Worker 已被终止；再次运行会重新初始化运行时。</p>}
      {failureKind === 'cancelled' && <p>Worker 已被终止；再次运行会重新初始化运行时。</p>}
    </div>}

    {isError && hasStdout && <div className="mio-partial-output">
      <span>出错前的输出</span>
      <pre aria-label="部分标准输出">{result.stdout}</pre>
    </div>}
  </section>;
}

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
      {!pending && result && <ResultPanel result={result} />}
    </div>
  </div>;
}
