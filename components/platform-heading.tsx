import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { PlatformBadge } from './platform-badge';
import { PlatformSupport } from './platform-support';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
/** Keep interactive badges outside Fumadocs' heading permalink. */
function heading(as: HeadingTag) {
  const DefaultHeading = defaultMdxComponents[as];
  return function PlatformHeading({ children, ...props }: ComponentProps<'h2'>) {
    const text: ReactNode[] = [];
    const badges: ReactNode[] = [];
    Children.forEach(children, child => {
      if (isValidElement(child) && (child.type === PlatformBadge || child.type === PlatformSupport)) badges.push(child);
      else text.push(child);
    });
    if (!badges.length) return <DefaultHeading {...props}>{children}</DefaultHeading>;
    return <div className={`platform-heading platform-heading-${as}`}><DefaultHeading {...props}>{text}</DefaultHeading><span className="platform-support">{badges}</span></div>;
  };
}
export const platformHeadings = { h1: heading('h1'), h2: heading('h2'), h3: heading('h3'), h4: heading('h4'), h5: heading('h5'), h6: heading('h6') };
