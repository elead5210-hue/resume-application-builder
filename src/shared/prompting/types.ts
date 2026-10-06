/**
 * Shared types for the prompting module.
 *
 * These types are used by the prompt builder and by the per-stage
 * instruction templates.
 */

/**
 * The three parts every prompt is assembled from.
 */
export interface PromptParts {
  /** What the AI is being asked to do at this stage. */
  instruction: string;
  /** The user's context the AI should work from (already serialized to text). */
  context: string;
  /** The JSON schema, as text, that the AI's reply must conform to. */
  schema: string;
}

/**
 * A reusable instruction template for one stage of a session.
 *
 * Templates keep the wording of an instruction in one place so it can be
 * tuned without touching the builder.
 */
export interface PromptTemplate {
  /** The instruction text sent to the AI for this stage. */
  instruction: string;
}