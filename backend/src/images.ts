import type { ImageStore } from './store'
import type { NewsItemInput } from './types'

export type ResolvedImage = {
  data: Buffer
  mimeType: string
}

const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])

function mimeFromUrl(url: string, fallback: string) {
  const lower = url.split('?')[0]?.toLowerCase() ?? ''
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return fallback
}

function idFromLocalUrl(url: string) {
  const match = url.match(/\/api\/images\/([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

async function fetchRemote(url: string): Promise<ResolvedImage | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'digest-generator/1.0',
        accept: 'image/*,*/*',
      },
      redirect: 'follow',
    })
    if (!response.ok) return null
    const mimeType = mimeFromUrl(url, response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg')
    if (!ALLOWED.has(mimeType) && !mimeType.startsWith('image/')) return null
    const data = Buffer.from(await response.arrayBuffer())
    if (!data.length) return null
    return { data, mimeType: ALLOWED.has(mimeType) ? mimeType : 'image/jpeg' }
  } catch {
    return null
  }
}

export async function resolveItemImage(
  item: NewsItemInput,
  store: ImageStore,
): Promise<ResolvedImage | null> {
  if (item.image_id) {
    const stored = await store.get(item.image_id)
    if (stored) return { data: stored.data, mimeType: stored.mimeType }
  }

  const url = item.image_url?.trim()
  if (!url) return null

  const localId = idFromLocalUrl(url)
  if (localId) {
    const stored = await store.get(localId)
    if (stored) return { data: stored.data, mimeType: stored.mimeType }
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return fetchRemote(url)
  }

  return null
}
