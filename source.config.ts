import { defineConfig } from 'fumadocs-mdx/config';
import mio from './syntaxes/mio.tmLanguage.json';
export default defineConfig({ mdxOptions: { rehypeCodeOptions: { themes: { light: 'github-light', dark: 'github-dark' }, langs: [{ ...mio, name: 'mio', aliases: ['Mio'] }] } } });
