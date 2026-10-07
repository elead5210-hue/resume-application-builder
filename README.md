# Resume Builder

Resume Builder is a browser-only React app that helps you turn a job posting into a tailored, styled, printable resume using any AI chat assistant. The app never calls an AI service itself. It builds prompts for you to copy, you paste them into the AI of your choice, and you paste the JSON reply back so the app can validate it and move on.

There is no backend. All data stays in your browser.

## Contents

- [Workflow](#workflow)
- [The selector contract](#the-selector-contract)
- [Tuning the prompt templates](#tuning-the-prompt-templates)
- [Privacy and local-only storage](#privacy-and-local-only-storage)
- [Backups](#backups)
- [Development](#development)
- [Deploying as a static site](#deploying-as-a-static-site)

## Workflow

Every step uses the same pattern: **copy a prompt, paste it into your AI, paste the reply back, validate**. Each prompt states the exact JSON shape the reply must have, and the app validates the reply before accepting it. If validation fails, fix the reply or ask the AI to correct it and paste it again.

1. **Job context.** Paste the job details (posting, requirements, any notes about yourself) into the app.
2. **Checklist setup.** The app generates a prompt asking the AI to propose a checklist of what the resume needs to cover. Paste the reply back to create the checklist.
3. **Question loop.** Each round, the app builds a prompt containing the job context, the checklist and your previous answers. The AI replies with questions and checklist progress. You answer the questions, and the loop repeats until every checklist item is complete.
4. **Final HTML.** Once the checklist is complete, the app asks the AI for the final resume as HTML. The HTML is sanitized before it is previewed.
5. **Styling.** A separate Styles section generates and stores CSS style sheets. You can create several, edit them and reuse them across resumes.
6. **Render and print.** The resume is shown in an A4 preview with the chosen style applied. From there you can print it or export it as HTML.

Because the exchange is plain text and JSON, you can use any AI assistant, and you can switch assistants between steps.

## The selector contract

The resume HTML and the style sheets are produced by different prompts, so they have to agree on a shared vocabulary of CSS class names. That agreement is the **selector contract**.

- The resume HTML prompt tells the AI to use only the classes the app defines for resume content.
- The style prompt tells the AI which selectors it must style, so the generated CSS targets the same classes the HTML uses.
- The app checks both sides:
  - The HTML is sanitized, so unsupported markup is removed.
  - The CSS is validated, so unsafe or unsupported rules are rejected.
  - The selectors in a style sheet can be compared against the contract, so you can see which classes a style does not cover.

The relevant code lives in `src/shared/prompting`:

| File | Role |
| --- | --- |
| `resume-classes.ts` | The list of resume classes that make up the contract |
| `extract-selectors.ts` | Pulls selectors out of CSS so they can be compared with the contract |
| `css-coverage.ts` | Reports which contract classes a style sheet covers |
| `validate-css.ts` | Validates generated CSS |
| `sanitize-html.ts` | Sanitizes generated HTML |
| `build-style-context.ts` | Builds the context sent with the style prompt |

If you add, rename or remove a class in the contract, update `resume-classes.ts` first. The prompts, validation and coverage checks all read from the shared contract, so they follow the change. Existing stored style sheets may then no longer cover every class, so regenerate or edit them.

## Tuning the prompt templates

All prompt text is kept in one place, `src/shared/prompting`, and is separate from the UI.

| File | What to change there |
| --- | --- |
| `preamble.ts` | Instructions shared by every prompt, such as tone and output rules |
| `templates.ts` | The wording of each prompt template |
| `build-loop-context.ts` | What the question loop prompt includes |
| `build-final-context.ts` | What the final HTML prompt includes |
| `build-style-context.ts` | What the style prompt includes |
| `build-prompt.ts` | How the preamble, template and context are assembled into the final prompt |
| `json-schemas.ts` | The JSON shape each prompt tells the AI to return |
| `response-schemas.ts` | The validation applied to each pasted reply |
| `parse-response.ts` | How a pasted reply is parsed |

Guidelines for tuning:

- **Keep schemas and validation in sync.** The JSON shape in a prompt (`json-schemas.ts`) must match what the app accepts (`response-schemas.ts`). If you change one, change the other.
- **Change wording freely, change structure carefully.** Rewording instructions to get better answers is safe. Renaming fields or changing the JSON shape also requires updating the schemas and the code that reads the parsed result.
- **Keep the selector contract in the prompts.** If you edit the HTML or style templates, keep the instruction to use only the contract classes.
- **Run the tests after each change.** The tests next to the prompting code (`build-prompt.test.ts`, `parse-response.test.ts`, `response-schemas.test.ts`, `extract-selectors.test.ts`, `validate-css.test.ts`) check prompt building, parsing, schemas and CSS validation.
- **Try it with a real assistant.** Run the full flow with a real AI after a significant edit. Different assistants follow instructions differently, and strict schema wording helps.

## Privacy and local-only storage

Resume Builder has no server, no accounts and no analytics backend. Everything you enter is stored only in the browser you are using. This has consequences you should know about:

- **Your data does not leave your device through this app.** The app does not upload your job context, answers or resumes anywhere. The only way data reaches an AI service is when *you* paste a prompt into one. Anything you paste there is governed by that service's own privacy terms, so check them before pasting personal details.
- **Data is tied to one browser profile on one device.** Another browser, another device or a private window will not see your sessions or styles.
- **Clearing site data deletes your work.** Clearing cookies and site data, using a "clear browsing data" tool or uninstalling the browser can erase everything with no way to recover it.
- **Browsers may evict storage.** Browsers can remove site data under storage pressure, and private or incognito windows discard it when closed.
- **Anyone with access to your browser profile can read the data.** It is not encrypted by the app. Avoid using the app on shared or public computers.
- **There is no sync and no server-side backup.** If you lose the data, it is gone unless you exported a backup.

Back up regularly, especially before clearing browser data or switching machines.

## Backups

The app can export all your stored data to a file and import it again. The backup panel in the app lets you download a backup and restore one, and backups are versioned so that older backup files can be migrated when you import them. The storage code lives in `src/shared/storage`.

Recommendations:

- Export a backup after finishing a resume or a style you care about.
- Keep backup files somewhere you trust, because they contain everything you entered, including personal details.
- To move to another browser or device, export in the old one and import in the new one.

## Development

Requirements: a recent Node.js and npm.

```bash
npm install
npm run dev
```

The project uses Vite, React and TypeScript, with Vitest for unit tests and Playwright for the end-to-end test in `e2e/`. See the `scripts` section of `package.json` for the exact commands available for building, linting and testing.

## Deploying as a static site

The build produces a plain static bundle with no backend, so it can be hosted on any static host. The build output goes to `dist/`.

```bash
npm install
npm run build
```

The app uses client-side routes, so the host must serve `index.html` for any path that is not a real file. Otherwise opening or refreshing a deep link returns a 404.

### Vercel

1. Import the repository in Vercel.
2. Use the Vite framework preset, or set the build command to `npm run build` and the output directory to `dist`.
3. The `vercel.json` in the repository root adds a single-page-app rewrite so every route loads `index.html`.

### Netlify

1. Import the repository in Netlify.
2. Set the build command to `npm run build` and the publish directory to `dist`.
3. The `public/_redirects` file is copied into `dist` by the build and sends every route to `index.html`.

### GitHub Pages

1. Build the app and publish the contents of `dist/` to GitHub Pages, for example with a GitHub Actions workflow.
2. Project sites are served from a sub-path (`/<repository-name>/`), so set the Vite `base` option in `vite.config.ts` to match before building.
3. GitHub Pages has no rewrite rules. Copy `dist/index.html` to `dist/404.html` after building so deep links fall back to the app.

### After deploying

- Open a deep link directly and refresh it to confirm the fallback works.
- Remember that stored data is tied to the site's origin. Moving to a new domain starts with empty storage, so export a backup from the old address and import it at the new one.