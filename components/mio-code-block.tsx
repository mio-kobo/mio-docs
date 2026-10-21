import type { ComponentProps, ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { MioPlayground } from './mio-playground';

type PreProps = Omit<ComponentProps<'pre'>, 'title'> & {
  children?: ReactNode;
  title?: ReactNode;
  icon?: ReactNode;
  'data-mio-source'?: string;
};

/**
 * MDX maps every fenced code block to `pre`. Blocks marked eligible by the
 * build-time Shiki transformer carry their untouched source in
 * `data-mio-source`; everything else keeps Fumadocs' native code block.
 */
export function MioCodeBlock(props: PreProps) {
  const source = props['data-mio-source'];
  if (typeof source !== 'string') {
    return defaultMdxComponents.pre(props as ComponentProps<typeof defaultMdxComponents.pre>);
  }

  return <MioPlayground
    source={source}
    title={typeof props.title === 'string' ? props.title : undefined}
    icon={typeof props.icon === 'string' ? props.icon : undefined}
    highlighted={props.children}
  />;
}
