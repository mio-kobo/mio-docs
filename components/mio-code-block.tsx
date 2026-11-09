import type { ComponentProps, ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MioPlaygroundVersion } from '@/lib/mio-playground-version.mjs';
import { hasSupportedImports } from '@/lib/mio-example-policy.mjs';
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
export function MioCodeBlock({ version, 'data-mio-source': source, ...props }: PreProps & { version: MioPlaygroundVersion }) {
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
