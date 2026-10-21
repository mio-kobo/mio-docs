import { defineI18nUI } from 'fumadocs-ui/i18n';
// Only published locales belong in languages. Do not enable untranslated fallbacks.
export const i18n = defineI18nUI({ languages: ['zh-CN'], defaultLanguage: 'zh-CN', hideLocale: 'default-locale' }, {
  'zh-CN': {
    displayName: '简体中文',
    'Search(search trigger)': '搜索文档',
    'Search(search dialog)': '搜索文档',
    'Open Search(search trigger)(aria-label)': '搜索文档',
    'Close Search(search dialog)(aria-label)': '关闭搜索',
    'No results found(search dialog)': '未找到结果',
    'Search failed(search dialog)': '搜索失败',
    'On this page(table of contents)': '本页目录',
    'No Headings(table of contents)': '本页没有标题',
    'Table of Contents(inline table of contents)': '目录',
    'Next Page(pagination)': '下一页',
    'Previous Page(pagination)': '上一页',
    'Toggle Menu(mobile menu)(aria-label)': '切换导航菜单',
    'Open Sidebar(sidebar)(aria-label)': '打开文档导航',
    'Close Sidebar(sidebar)(aria-label)': '关闭文档导航',
    'Collapse Sidebar(sidebar)(aria-label)': '收起文档导航',
    'Copy Text(code block)(aria-label)': '复制代码',
    'Copied Text(code block)(aria-label)': '已复制代码',
    'Copy Anchor Link(heading anchor)(aria-label)': '复制章节链接',
    'Copied Anchor Link(heading anchor)(aria-label)': '已复制章节链接',
    'Light(theme switcher)(aria-label)': '浅色主题',
    'Dark(theme switcher)(aria-label)': '深色主题',
    'System(theme switcher)(aria-label)': '跟随系统',
    'Toggle Theme(theme switcher)(aria-label)': '切换主题',
  },
});
export const plannedLocales = ['en', 'ja'] as const;
