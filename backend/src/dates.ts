import type { DigestMeta, NewsItemInput } from './types'

export function todayIso() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysIso(iso: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!match) return iso
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days))
  return date.toISOString().slice(0, 10)
}

export function periodFromProvision(provisionDate: string) {
  const provision = provisionDate.trim()
  return {
    provision,
    start: addDaysIso(provision, -6),
    end: provision,
  }
}

export function digestFilename(provisionDate: string) {
  const date = addDaysIso(provisionDate.trim(), 1)
  return `Дайджест_IТ_Анализ_инструментов_и_технологий_${date}_Нурулла_Амин.docx`
}

export function formatRuDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (match) return `${match[3]}.${match[2]}.${match[1]}`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${date.getFullYear()}`
}

function itemProvisionDate(item: NewsItemInput) {
  return item.provision_date?.trim() || item.committee_date?.trim() || ''
}

export function resolveCoverDates(items: NewsItemInput[], meta: DigestMeta) {
  const fromItems = items.map(itemProvisionDate).filter(Boolean).sort()
  const provision = meta.provisionDate?.trim() || fromItems.at(-1) || todayIso()
  return periodFromProvision(provision)
}
