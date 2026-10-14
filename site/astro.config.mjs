// @ts-check
import casoonPages from '@casoon/pages-theme';
import { defineConfig } from 'astro/config';

// Project page: https://casoon.github.io/trackr/ — `base` is the GitHub Pages path.
export default defineConfig({
  site: 'https://casoon.github.io/trackr',
  base: '/trackr/',
  integrations: [
    casoonPages({
      name: 'trackr',
      description:
        'Privacy-first analytics for static sites: a small browser script, a server handler that anonymizes before it stores, and storage adapters for Postgres, webhooks, GA4 and more.',
      repo: 'casoon/trackr',
      branch: 'master',
      version: '0.3.0',
      license: 'LGPL-3.0-or-later',
      packages: [
        { label: 'npm', href: 'https://www.npmjs.com/package/@casoon/trackr' },
        { label: 'Website', href: 'https://trackr.casoon.de' },
        { label: 'Dashboard', href: 'https://trackr-dashboard.casoon.dev' },
      ],
      mdxComponents: './src/mdx-components.ts',
      docsGroups: {
        'getting-started': 'Getting started',
        guides: 'Guides',
        reference: 'Reference',
      },
    }),
  ],
});
