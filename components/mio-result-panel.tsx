import { AlertCircle, CircleCheck } from 'lucide-react';
import type { MioResult } from '@/lib/mio-runtime';

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

export function MioResultPanel({ result, label = 'Mio Playground 结果' }: { result: MioResult; label?: string }) {
  const hasStdout = result.stdout.length > 0;
  const isDiagnostic = result.status === 'diagnostic';
  const isError = result.status === 'error';
  const showLoadHint = result.failureKind === 'load';
  const showCompileTiming = result.status !== 'error' || result.compileMs > 0;

  return <section className={`mio-result is-${result.status}${isError ? ' is-error' : ''}`} aria-label={label}>
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
      {result.failureKind === 'timeout' && <p>执行超时后 Worker 已被终止；再次运行会重新初始化运行时。</p>}
      {result.failureKind === 'cancelled' && <p>Worker 已被终止；再次运行会重新初始化运行时。</p>}
    </div>}

    {isError && hasStdout && <div className="mio-partial-output">
      <span>出错前的输出</span>
      <pre aria-label="部分标准输出">{result.stdout}</pre>
    </div>}
  </section>;
}
