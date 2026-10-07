/**
 * Global print stylesheet for the resume renderer.
 *
 * It is injected before any saved style, so a style can override anything
 * here. It does three things:
 *
 * 1. Defines the custom properties (page size, margins, header and footer
 *    heights, font sizes and colours) that styles and the built-in style read.
 * 2. Sets up the A4 page. Header and footer text use @page margin boxes,
 *    driven by the --resume-header-content and --resume-footer-content
 *    properties. Browsers without margin box support ignore them.
 * 3. Adds the page-break rules and print-color-adjust that make printed pages
 *    look right: entries stay in one piece, headings never sit alone at the
 *    bottom of a page, and backgrounds print.
 *
 * The values live in one object so the custom properties and the literal
 * @page margins cannot drift apart. Browsers do not reliably accept var() in
 * @page margins, so the page margins are written out from the same values.
 */

/** The default values behind the global custom properties. */
export const PRINT_DEFAULTS = {
  pageWidth: '210mm',
  pageHeight: '297mm',
  marginTop: '16mm',
  marginRight: '16mm',
  marginBottom: '16mm',
  marginLeft: '16mm',
  headerHeight: '10mm',
  footerHeight: '10mm',
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: '11pt',
  fontSizeSmall: '9pt',
  fontSizeSection: '12pt',
  fontSizeName: '20pt',
  lineHeight: '1.45',
  textColor: '#1a1a1a',
  mutedColor: '#555555',
  accentColor: '#1f3a5f',
  ruleColor: '#bbbbbb',
  backgroundColor: '#ffffff',
} as const

/**
 * The custom properties defined by the stylesheet, in the order they are
 * written. Saved styles and the style prompt can rely on these names.
 */
export const PRINT_CSS_VARIABLES = [
  '--resume-page-width',
  '--resume-page-height',
  '--resume-margin-top',
  '--resume-margin-right',
  '--resume-margin-bottom',
  '--resume-margin-left',
  '--resume-margin',
  '--resume-header-height',
  '--resume-footer-height',
  '--resume-header-content',
  '--resume-footer-content',
  '--resume-font-family',
  '--resume-font-size',
  '--resume-font-size-small',
  '--resume-font-size-section',
  '--resume-font-size-name',
  '--resume-line-height',
  '--resume-text-color',
  '--resume-muted-color',
  '--resume-accent-color',
  '--resume-rule-color',
  '--resume-background-color',
] as const

/** The name of one global custom property. */
export type PrintCssVariable = (typeof PRINT_CSS_VARIABLES)[number]

const d = PRINT_DEFAULTS

/** The global print stylesheet, ready to inject before any saved style. */
export const GLOBAL_PRINT_CSS = [
  ':root {',
  `  --resume-page-width: ${d.pageWidth};`,
  `  --resume-page-height: ${d.pageHeight};`,
  `  --resume-margin-top: ${d.marginTop};`,
  `  --resume-margin-right: ${d.marginRight};`,
  `  --resume-margin-bottom: ${d.marginBottom};`,
  `  --resume-margin-left: ${d.marginLeft};`,
  `  --resume-margin: ${d.marginTop};`,
  `  --resume-header-height: ${d.headerHeight};`,
  `  --resume-footer-height: ${d.footerHeight};`,
  '  --resume-header-content: "";',
  '  --resume-footer-content: "";',
  `  --resume-font-family: ${d.fontFamily};`,
  `  --resume-font-size: ${d.fontSize};`,
  `  --resume-font-size-small: ${d.fontSizeSmall};`,
  `  --resume-font-size-section: ${d.fontSizeSection};`,
  `  --resume-font-size-name: ${d.fontSizeName};`,
  `  --resume-line-height: ${d.lineHeight};`,
  `  --resume-text-color: ${d.textColor};`,
  `  --resume-muted-color: ${d.mutedColor};`,
  `  --resume-accent-color: ${d.accentColor};`,
  `  --resume-rule-color: ${d.ruleColor};`,
  `  --resume-background-color: ${d.backgroundColor};`,
  '}',
  '',
  '@page {',
  '  size: A4;',
  `  margin: ${d.marginTop} ${d.marginRight} ${d.marginBottom} ${d.marginLeft};`,
  '',
  '  @top-center {',
  '    content: var(--resume-header-content, "");',
  '    height: var(--resume-header-height);',
  '    font-family: var(--resume-font-family);',
  '    font-size: var(--resume-font-size-small);',
  '    color: var(--resume-muted-color);',
  '  }',
  '',
  '  @bottom-center {',
  '    content: var(--resume-footer-content, "");',
  '    height: var(--resume-footer-height);',
  '    font-family: var(--resume-font-family);',
  '    font-size: var(--resume-font-size-small);',
  '    color: var(--resume-muted-color);',
  '  }',
  '}',
  '',
  '* {',
  '  -webkit-print-color-adjust: exact;',
  '  print-color-adjust: exact;',
  '}',
  '',
  'html,',
  'body {',
  '  margin: 0;',
  '  background: var(--resume-background-color);',
  '  color: var(--resume-text-color);',
  '}',
  '',
  'body {',
  '  font-family: var(--resume-font-family);',
  '  font-size: var(--resume-font-size);',
  '  line-height: var(--resume-line-height);',
  '}',
  '',
  'h1,',
  'h2,',
  'h3,',
  'h4,',
  'h5,',
  'h6 {',
  '  break-after: avoid;',
  '  page-break-after: avoid;',
  '}',
  '',
  '.entry,',
  'li,',
  'tr,',
  'blockquote {',
  '  break-inside: avoid;',
  '  page-break-inside: avoid;',
  '}',
  '',
  'p {',
  '  orphans: 3;',
  '  widows: 3;',
  '}',
  '',
  '@media print {',
  '  html,',
  '  body {',
  '    width: auto;',
  '    height: auto;',
  '  }',
  '}',
].join('\n')