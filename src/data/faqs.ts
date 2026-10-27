export type QA = { q: string; a: string }

/**
 * The questions people ask before they email. One list, used by the FAQ
 * accordion on the Contact view (and the legacy long-scroll FAQ section).
 * Five questions, two or three sentences each: the accordion sits in a
 * fixed panel and more than that pushes the email row off the plate.
 */
export const FAQS: QA[] = [
  {
    q: 'What do you do?',
    a: 'PLACEHOLDER - tell me what to put here: the kinds of work you take on, and who it is usually for.',
  },
  {
    q: 'How fast can you start?',
    a: 'PLACEHOLDER - tell me what to put here: your usual lead time for small fixes vs. larger projects, and your working hours.',
  },
  {
    q: 'How much do you charge?',
    a: 'PLACEHOLDER - tell me what to put here: how you price (hourly, per project, retainer) and how a quote is put together.',
  },
  {
    q: 'Where are you based?',
    a: 'PLACEHOLDER - tell me what to put here: your location or timezone, and which client timezones you overlap with.',
  },
  {
    q: 'What happens after I write?',
    a: 'PLACEHOLDER - tell me what to put here: how fast you reply and what the next step looks like.',
  },
]
