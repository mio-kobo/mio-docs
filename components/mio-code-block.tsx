import type { ComponentProps, ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MioPlaygroundVersion } from '@/lib/mio-playground-version.mjs';
import { hasSupportedImports } from '@/lib/mio-example-policy.mjs';
import { MermaidDiagram } from './mermaid-diagram';
import { MioPlayground } from './mio-playground';

type PreProps = Omit<ComponentProps<'pre'>, 'title'> & {
  children?: ReactNode;
  title?: ReactNode;
  icon?: ReactNode;
  'data-mio-source'?: string;
  'data-mermaid-source'?: string;
};

/**
 * MDX maps every fenced code block to `pre`. Blocks marked eligible by the
 * build-time Shiki transformer carry their untouched source in
 * `data-mio-source`; everything else keeps Fumadocs' native code block.
 * `mermaid` fences are replaced by a rendered diagram instead of raw source.
 */
export function MioCodeBlock({ version, 'data-mio-source': source, 'data-mermaid-source': mermaid, ...props }: PreProps & { version: MioPlaygroundVersion }) {
  if (typeof mermaid === 'string') {
    return <MermaidDiagram chart={mermaid} title={typeof props.title === 'string' ? props.title : undefined} />;
  }

  if (typeof source !== 'string' || !hasSupportedImports(source, version)) {
    return defaultMdxComponents.pre(props as ComponentProps<typeof defaultMdxComponents.pre>);
  }

  return <MioPlayground
    source={source}
    version={version}
    title={typeof props.title === 'string' ? props.title : undefined}
    icon={typeof props.icon === 'string' ? props.icon : undefined}
    highlighted={props.children}
  />;
}
