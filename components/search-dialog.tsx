'use client';
import type { DefaultSearchDialogProps } from 'fumadocs-ui/components/dialog/search-default';
import { SearchDialog, SearchDialogOverlay, SearchDialogContent, SearchDialogHeader, SearchDialogIcon, SearchDialogInput, SearchDialogClose, SearchDialogList, SearchDialogFooter, TagsList, TagsListItem } from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { defaultVersion, getVersion, parseDocsPath, versions, versionLabel } from '@/lib/versions.mjs';
export function VersionSearchDialog(props: DefaultSearchDialogProps) {
  const current = parseDocsPath(usePathname());
  const version = getVersion(current?.version)?.id ?? defaultVersion;
  const locale = current?.locale ?? 'zh-CN';
  return <ScopedSearch key={`${version}:${locale}`} {...props} version={version} locale={locale} />;
}
function ScopedSearch({version,locale,open,onOpenChange}:{version:string;locale:string}&DefaultSearchDialogProps) {
  const [tag,setTag] = useState(version);
  const search = useDocsSearch({client:fetchClient({api:'/api/search',locale,tag}),delayMs:100});
  return <SearchDialog {...search} open={open} onOpenChange={onOpenChange}>
    <SearchDialogOverlay />
    <SearchDialogContent>
      <SearchDialogHeader><SearchDialogIcon /><SearchDialogInput /><SearchDialogClose /></SearchDialogHeader>
      <SearchDialogList />
      <SearchDialogFooter>
        <TagsList tag={tag} onTagChange={value=>{if(value)setTag(value);}} allowClear={false}>
          {versions.filter(v=>v.locales.includes(locale)).map(v=><TagsListItem key={v.id} value={v.id}>{versionLabel(v)}</TagsListItem>)}
        </TagsList>
        <p className="mt-2 text-xs leading-5 text-fd-muted-foreground">按所选版本搜索；每条结果标明版本。未版本化资料不混入索引。</p>
      </SearchDialogFooter>
    </SearchDialogContent>
  </SearchDialog>;
}
