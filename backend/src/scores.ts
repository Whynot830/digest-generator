import type { NewsItemInput } from './types'

export const SCORE_MIN = 3
export const SCORE_MAX = 5

export const SCORE_FIELDS = [
  'applicability',
  'maturity',
  'implementation',
  'transformation',
] as const

export type ScoreField = (typeof SCORE_FIELDS)[number]

export function parseScore(value: unknown) {
  const n =
    typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.').trim())
  if (!Number.isFinite(n) || n < SCORE_MIN || n > SCORE_MAX) {
    throw new Error(`Оценка должна быть от ${SCORE_MIN} до ${SCORE_MAX}`)
  }
  return n
}

export function assertPayloadScores(items: NewsItemInput[]) {
  items.forEach((item, index) => {
    for (const field of SCORE_FIELDS) {
      try {
        parseScore(item[field])
      } catch {
        const title = item.name?.trim() || `новость ${index + 1}`
        throw new Error(
          `Оценка ${field} в «${title}» должна быть числом от ${SCORE_MIN} до ${SCORE_MAX}`,
        )
      }
    }
  })
}
