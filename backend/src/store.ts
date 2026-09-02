import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StoredImage, StoredImageMeta } from './types'

export type ImageStore = {
  save: (file: { filename: string; mimeType: string; data: Buffer }) => Promise<StoredImage>
  get: (id: string) => Promise<StoredImage | null>
  list: () => Promise<StoredImageMeta[]>
}

const mimeToExt: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
}

function extFor(mimeType: string, filename: string) {
  return mimeToExt[mimeType] ?? (path.extname(filename) || '.bin')
}

export function createImageStore(): ImageStore {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/images')

  async function ensure() {
    await mkdir(root, { recursive: true })
  }

  return {
    async save(file) {
      await ensure()
      const id = randomUUID()
      const filename = `${id}${extFor(file.mimeType, file.filename)}`
      await writeFile(path.join(root, filename), file.data)
      const meta: StoredImageMeta = {
        id,
        filename: file.filename,
        mimeType: file.mimeType,
        createdAt: new Date().toISOString(),
      }
      await writeFile(path.join(root, `${id}.json`), JSON.stringify(meta))
      return { ...meta, data: file.data }
    },
    async get(id) {
      await ensure()
      try {
        const meta = JSON.parse(
          await readFile(path.join(root, `${id}.json`), 'utf8'),
        ) as StoredImageMeta
        const files = await readdir(root)
        const bin = files.find((name) => name.startsWith(id) && !name.endsWith('.json'))
        if (!bin) return null
        return { ...meta, data: await readFile(path.join(root, bin)) }
      } catch {
        return null
      }
    },
    async list() {
      await ensure()
      const files = (await readdir(root)).filter((name) => name.endsWith('.json'))
      const items: StoredImageMeta[] = []
      for (const file of files) {
        items.push(JSON.parse(await readFile(path.join(root, file), 'utf8')) as StoredImageMeta)
      }
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
  }
}
