import { z } from 'zod'

/**
 * Zod schemas for every AI response type the app accepts.
 *
 * Each schema describes the JSON a pasted response must contain. The
 * inferred types are exported next to the schemas so callers get the
 * validated shape without writing it twice.
 */

/** Status of a single checklist item in an AI response. */
export const checklistItemStatusSchema = z.enum([
  'pending',
  'in_progress',
  'complete',
])

/** One checklist item in an AI response. */
export const checklistItemSchema = z.object({
  id: z.string().min(1, 'id must not be empty'),
  label: z.string().min(1, 'label must not be empty'),
  status: checklistItemStatusSchema,
})

/** Response to the checklist setup stage: the generated checklist. */
export const checklistResponseSchema = z.object({
  items: z.array(checklistItemSchema).min(1, 'items must contain at least one item'),
})

/** One question the AI asks the user during the question loop. */
export const questionSchema = z.object({
  id: z.string().min(1, 'id must not be empty'),
  text: z.string().min(1, 'text must not be empty'),
})

/** Response to a question loop round: new questions plus the updated checklist. */
export const questionsResponseSchema = z.object({
  questions: z.array(questionSchema),
  checklist: checklistResponseSchema,
})

/** Response to the final stage: the finished resume as HTML. */
export const finalHtmlResponseSchema = z.object({
  html: z.string().min(1, 'html must not be empty'),
})

/** Response to the styling generator: a named CSS style. */
export const styleResponseSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  css: z.string().min(1, 'css must not be empty'),
})

export type ChecklistResponse = z.infer<typeof checklistResponseSchema>
export type QuestionsResponse = z.infer<typeof questionsResponseSchema>
export type FinalHtmlResponse = z.infer<typeof finalHtmlResponseSchema>
export type StyleResponse = z.infer<typeof styleResponseSchema>