'use client';

import { useEffect, useId, useRef, useState } from 'react';

type MermaidDiagramProps = {
  chart: string;
  title?: string;
};

const fontFamily = "ui-sans-serif, system-ui, -apple-system, 'Noto Sans SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

/** Mermaid keeps module-level state, so renders must not overlap during a theme change. */
let renderChain: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  const result = renderChain.then(task, task);
  renderChain = result.catch(() => undefined);
  return result;
}

function themeConfig(dark: boolean, styles: CSSStyleDeclaration) {
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const foreground = read('--color-fd-foreground', dark ? '#e1e8f3' : '#202c40');
  const background = read('--color-fd-background', dark ? '#0e1728' : '#fcfdff');
  const primary = read('--color-fd-primary', dark ? '#91bef6' : '#4370b9');
  const border = read('--color-fd-border', dark ? '#2c3b53' : '#dce3ed');
  const muted = read('--color-fd-muted', dark ? '#19263b' : '#edf2f8');

  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    theme: 'base' as const,
    fontFamily,
    themeVariables: {
      background,
      primaryColor: muted,
      primaryTextColor: foreground,
      primaryBorderColor: primary,
      secondaryColor: background,
      secondaryTextColor: foreground,
      secondaryBorderColor: border,
      tertiaryColor: muted,
      tertiaryTextColor: foreground,
      tertiaryBorderColor: border,
      lineColor: primary,
      textColor: foreground,
      mainBkg: muted,
      nodeBorder: primary,
      clusterBkg: background,
      clusterBorder: border,
      edgeLabelBackground: background,
      titleColor: foreground,
      nodeTextColor: foreground,
      fontSize: '14px',
    },
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis' as const,
      padding: 8,
      nodeSpacing: 30,
      rankSpacing: 30,
      wrappingWidth: 340,
    },
  };
}

/**
 * Renders the fenced `mermaid` source captured by `source.config.ts` at build
 * time. Mermaid is loaded in the browser so the static export and the server
 * render never depend on a DOM. Re-rendering is tied to the site theme class.
 */
export function MermaidDiagram({ chart, title }: MermaidDiagramProps) {
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  const renderVersion = useRef(0);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/gu, '');
  const captionId = `mermaid-${reactId}-caption`;

  useEffect(() => {
    mounted.current = true;

    const render = () => {
      const version = ++renderVersion.current;
      const dark = document.documentElement.classList.contains('dark');
      const config = themeConfig(dark, getComputedStyle(document.documentElement));

      enqueue(async () => {
        if (!mounted.current || version !== renderVersion.current) return;
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize(config);
        const result = await mermaid.render(`mermaid-${reactId}-${version}`, chart);
        if (!mounted.current || version !== renderVersion.current) return;
        setSvg(result.svg);
        setFailed(false);
      }).catch(error => {
        if (!mounted.current || version !== renderVersion.current) return;
        console.error('Unable to render Mermaid diagram', error);
        setSvg('');
        setFailed(true);
      });
    };

    render();
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'attributes' && record.attributeName === 'class')) render();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mounted.current = false;
      observer.disconnect();
    };
  }, [chart, reactId]);

  return <figure className="mermaid-diagram" aria-labelledby={title ? captionId : undefined}>
    <div className="mermaid-diagram-canvas" role="region" aria-label={title ?? 'Bunko 软件包审核流程图'} tabIndex={0}>
      {svg
        ? <div className="mermaid-diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />
        : failed
          ? <p className="mermaid-diagram-status is-error">流程图渲染失败。请刷新页面；如果问题持续，请报告文档问题。</p>
          : <p className="mermaid-diagram-status">正在渲染流程图…</p>}
    </div>
    {title && <figcaption id={captionId}>{title}<span className="mermaid-diagram-scroll-hint" aria-hidden="true"> · 可横向滚动</span></figcaption>}
  </figure>;
}
