import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import mermaid from 'astro-mermaid'

export default defineConfig({
  site: 'https://signed-data.org',
  integrations: [
    // Mermaid must run before Starlight so the remark plugin sees the
    // fenced ```mermaid blocks before Starlight's MDX pipeline.
    mermaid({
      theme: 'dark',
      autoTheme: true,
    }),
    starlight({
      title: 'SignedData',
      defaultLocale: 'root',
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        'pt-br': {
          label: 'Português (Brasil)',
          lang: 'pt-BR',
        },
        es: {
          label: 'Español',
          lang: 'es',
        },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/signed-data',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: '',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&display=swap',
          },
        },
      ],
      // Enable docs features now that the site has a real docs tree.
      // Splash pages opt out via `template: splash` and CSS scoping.
      pagefind: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      sidebar: [
        {
          label: 'Products',
          translations: {
            'pt-BR': 'Produtos',
            es: 'Productos',
          },
          items: [
            {
              slug: 'products',
              label: 'Overview',
              translations: { 'pt-BR': 'Visão geral', es: 'Visión general' },
            },
            {
              slug: 'products/finance',
              label: 'Finance (Brazil)',
              translations: { 'pt-BR': 'Finanças (Brasil)', es: 'Finanzas (Brasil)' },
            },
            {
              slug: 'products/commodities',
              label: 'Commodities (Brazil)',
              translations: { 'pt-BR': 'Commodities (Brasil)', es: 'Commodities (Brasil)' },
            },
            {
              slug: 'products/companies',
              label: 'Companies (Brazil)',
              translations: { 'pt-BR': 'Empresas (Brasil)', es: 'Empresas (Brasil)' },
            },
            {
              slug: 'products/lottery',
              label: 'Lottery (Brazil)',
              translations: { 'pt-BR': 'Loteria (Brasil)', es: 'Lotería (Brasil)' },
            },
          ],
        },
        {
          label: 'Documentation',
          translations: {
            'pt-BR': 'Documentação',
            es: 'Documentación',
          },
          items: [
            {
              slug: 'docs/getting-started',
              label: 'Getting started',
              translations: { 'pt-BR': 'Primeiros passos', es: 'Primeros pasos' },
            },
            {
              slug: 'docs/architecture',
              label: 'Architecture',
              translations: { 'pt-BR': 'Arquitetura', es: 'Arquitectura' },
            },
            {
              slug: 'docs/linked-data',
              label: 'Linked Data',
              translations: { 'pt-BR': 'Linked Data', es: 'Linked Data' },
            },
            {
              slug: 'docs/signing',
              label: 'Signing',
              translations: { 'pt-BR': 'Assinatura', es: 'Firma' },
            },
            {
              slug: 'docs/content-types',
              label: 'Content types',
              translations: { 'pt-BR': 'Tipos de conteúdo', es: 'Tipos de contenido' },
            },
            {
              slug: 'docs/self-hosting',
              label: 'Self-hosting',
              translations: { 'pt-BR': 'Auto-hospedagem', es: 'Auto-hospedaje' },
            },
          ],
        },
        {
          label: 'Specification',
          translations: {
            'pt-BR': 'Especificação',
            es: 'Especificación',
          },
          items: [
            {
              slug: 'docs/spec/v0-2-0',
              label: 'CDS v0.2.0',
              translations: { 'pt-BR': 'CDS v0.2.0', es: 'CDS v0.2.0' },
            },
            {
              slug: 'docs/spec/v0-1-0',
              label: 'CDS v0.1.0',
              translations: { 'pt-BR': 'CDS v0.1.0', es: 'CDS v0.1.0' },
            },
            {
              slug: 'docs/spec/migration-v0-1-to-v0-2',
              label: 'Migration v0.1 → v0.2',
              translations: {
                'pt-BR': 'Migração v0.1 → v0.2',
                es: 'Migración v0.1 → v0.2',
              },
            },
            {
              label: 'Domains',
              translations: { 'pt-BR': 'Domínios', es: 'Dominios' },
              autogenerate: { directory: 'docs/spec/domains' },
            },
          ],
        },
        {
          label: 'Tutorials',
          translations: {
            'pt-BR': 'Tutoriais',
            es: 'Tutoriales',
          },
          items: [
            {
              slug: 'docs/tutorials/sign-first-event',
              label: 'Sign your first event',
              translations: {
                'pt-BR': 'Assine seu primeiro evento',
                es: 'Firma tu primer evento',
              },
            },
            {
              slug: 'docs/tutorials/verify-event',
              label: 'Verify a CDS event',
              translations: { 'pt-BR': 'Verificar um evento CDS', es: 'Verificar un evento CDS' },
            },
            {
              slug: 'docs/tutorials/claude-mcp-setup',
              label: 'Connect Claude to an MCP server',
              translations: {
                'pt-BR': 'Conectar Claude a um servidor MCP',
                es: 'Conectar Claude a un servidor MCP',
              },
            },
            {
              slug: 'docs/tutorials/self-host-issuer',
              label: 'Self-host an issuer',
              translations: {
                'pt-BR': 'Auto-hospedar um emissor',
                es: 'Auto-alojar un emisor',
              },
            },
          ],
        },
      ],
    }),
  ],
})
