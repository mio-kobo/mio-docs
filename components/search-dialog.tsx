'use client';
import type { DefaultSearchDialogProps } from 'fumadocs-ui/components/dialog/search-default';
import { SearchDialog, SearchDialogOverlay, SearchDialogContent, SearchDialogHeader, SearchDialogIcon, SearchDialogInput, SearchDialogClose, SearchDialogList, SearchDialogFooter, TagsList, TagsListItem } from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { versionSearchClient } from '@/lib/static-search';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { defaultVersion, getVersion, parseDocsPath, versions, versionLabel, versionPickerId } from '@/lib/versions.mjs';
export function VersionSearchDialog(props: DefaultSearchDialogProps) {
  const current = parseDocsPath(usePathname());
  const version = getVersion(current?.version)?.id ?? defaultVersion;
  const locale = current?.locale ?? 'zh-CN';
  return <ScopedSearch key={`${version}:${locale}`} {...props} version={version} locale={locale} />;
}
function ScopedSearch({version,locale,open,onOpenChange}:{version:string;locale:string}&DefaultSearchDialogProps) {
  const pickerId = versionPickerId(version);
  const [tag,setTag] = useState(pickerId);
  const opener = useRef<HTMLElement | null>(null);
  const search = useDocsSearch({client:versionSearchClient(tag === pickerId ? version : tag,locale),delayMs:100});
  return <SearchDialog {...search} open={open} onOpenChange={onOpenChange}>
    <SearchDialogOverlay />
    <SearchDialogContent
      onOpenAutoFocus={() => {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }}
      onCloseAutoFocus={event => {
        // Fumadocs opens search from a separate button or keyboard shortcut.
        if (opener.current?.isConnected) {
          event.preventDefault();
          opener.current.focus();
        }
      }}
    >
      <SearchDialogHeader><SearchDialogIcon /><SearchDialogInput /><SearchDialogClose /></SearchDialogHeader>
      <SearchDialogList />
      <SearchDialogFooter>
        <TagsList tag={tag} onTagChange={value=>{if(value)setTag(value);}} allowClear={false}>
          {versions.filter(v=>v.locales.includes(locale) && versionPickerId(v.id) === v.id).map(v=><TagsListItem key={v.id} value={v.id}>{v.id === 'v2.1' ? 'V2.1 系列' : versionLabel(v)}</TagsListItem>)}
        </TagsList>
        <p className="mt-2 text-xs leading-5 text-fd-muted-foreground">按所选版本搜索；每条结果标明版本。未版本化资料不混入索引。</p>
      </SearchDialogFooter>
    </SearchDialogContent>
  </SearchDialog>;
}
