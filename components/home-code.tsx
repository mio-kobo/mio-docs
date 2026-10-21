import Link from 'next/link';
import { ArrowRight, Terminal } from 'lucide-react';
import { getHighlighter, highlight } from 'fumadocs-core/highlight';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import mio from '@/syntaxes/mio.tmLanguage.json';
import example from '@/lib/home-example.json';

/** The pinned showcase and grammar are shared with the existing docs pipeline. */
export async function HomeCode() {
  await getHighlighter('js', { langs: [{ ...mio, name: 'mio' }] });
  const code = await highlight(example.code, {
    lang: 'mio',
    defaultColor: false,
    themes: { light: 'github-light', dark: 'github-dark' },
    components: { pre: (props) => <Pre {...props} /> },
  });
  return <div className="code-window">
    <CodeBlock title="hello-math.mio" icon={<Terminal size={15} aria-hidden="true" />} viewportProps={{ 'aria-label': 'Mio 数学示例，可横向滚动' }}>
      {code}
    </CodeBlock>
    <div className="code-output"><span>运行结果</span><pre tabIndex={0} aria-label="程序输出">{example.output}</pre></div>
    <Link href="/docs/learn/modules">读懂这段程序 <ArrowRight size={16} aria-hidden="true" /></Link>
  </div>;
}
