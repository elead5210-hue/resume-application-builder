# Project Brief: Resume Builder

**Purpose**
Resume Builder is a browser-only React app that helps someone produce a tailored, print-ready resume for a specific job, using any AI chat assistant they like. The app has no backend and no API keys. It acts as a structured workspace around a copy-and-paste conversation with an AI.

**The problem it solves**
Getting a good tailored resume out of an AI usually means a long, unstructured chat that drifts, forgets details, and returns inconsistent formatting. This app adds structure so the AI gathers the right information, knows when it has enough, and returns output that is predictable and reusable.

**How it works**
1. **Job context.** The user pastes the job details into the app.
2. **Checklist setup.** The app generates a prompt asking the AI for a checklist of everything needed for this resume. The checklist is saved and becomes the source of truth.
3. **Question loop.** Each round, the app builds a prompt containing the job context, the checklist, and the previous answers. The AI replies with one or two questions and an updated checklist. An item is only marked complete when the AI is satisfied, which keeps the loop finite.
4. **Final HTML.** Once every item is complete, the app requests the resume as semantic, unstyled HTML that uses a fixed set of class names.
5. **Styling.** A separate section generates and stores CSS styles that target the same class names, so any saved style works with any saved resume.
6. **Render and print.** The resume is displayed in a sandboxed frame, the user picks a style, and a print action outputs A4 pages with headers and footers controlled by global CSS variables.

**Key design principles**
- **AI-agnostic.** Everything is exchanged as prompts and JSON, so it works with any assistant.
- **Schema-driven.** Every prompt states the exact JSON shape expected, and every pasted response is validated, with clear errors if it doesn't match.
- **Separation of content and presentation.** The HTML carries structure only, and CSS lives separately, linked by a shared selector contract.
- **Local-first.** All data stays in the user's browser and is auto-saved, with import and export for backup.
- **One reusable pattern.** A single prompt, paste, validate and save component powers every stage of both flows.

**Outcome**
A user can go from a job posting to a polished, restyleable, A4-printable resume. They can reuse their styles across many applications and keep every session saved locally.

**Current status**
The project is at the planning stage. A 25-goal roadmap is defined, and the first goal, scaffolding the Vite + React + TypeScript project with routing, linting, formatting and a feature-based folder structure, has a file-level task plan ready.