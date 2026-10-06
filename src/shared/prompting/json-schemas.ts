/**
 * JSON schema texts for every AI response type.
 *
 * Each constant is the schema, as text, that is passed as the schema part of
 * buildPrompt so the AI knows the exact shape its reply must have. The shapes
 * mirror the zod schemas in response-schemas.ts and must be kept in sync with
 * them.
 */

/** Schema text for the checklist setup response. */
export const CHECKLIST_JSON_SCHEMA: string = JSON.stringify(
  {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
            label: { type: 'string', minLength: 1 },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'complete'],
            },
          },
          required: ['id', 'label', 'status'],
          additionalProperties: false,
        },
      },
    },
    required: ['items'],
    additionalProperties: false,
  },
  null,
  2,
)

/** Schema text for a question loop response: new questions plus the updated checklist. */
export const QUESTIONS_JSON_SCHEMA: string = JSON.stringify(
  {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
            text: { type: 'string', minLength: 1 },
          },
          required: ['id', 'text'],
          additionalProperties: false,
        },
      },
      checklist: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', minLength: 1 },
                label: { type: 'string', minLength: 1 },
                status: {
                  type: 'string',
                  enum: ['pending', 'in_progress', 'complete'],
                },
              },
              required: ['id', 'label', 'status'],
              additionalProperties: false,
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
    required: ['questions', 'checklist'],
    additionalProperties: false,
  },
  null,
  2,
)

/** Schema text for the final stage response: the finished resume as HTML. */
export const FINAL_HTML_JSON_SCHEMA: string = JSON.stringify(
  {
    type: 'object',
    properties: {
      html: { type: 'string', minLength: 1 },
    },
    required: ['html'],
    additionalProperties: false,
  },
  null,
  2,
)