import './env'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { generateDigestDocx } from './generateDocx'
import { resolveItemImage } from './images'
import { digestAuthorName, digestFilename, resolveCoverDates } from './dates'
import { assertPayloadScores } from './scores'
import { createImageStore } from './store'
import type { GeneratePayload, NewsItemInput } from './types'

const PORT = Number(process.env.PORT ?? 3001)
const store = createImageStore()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

function normalizePayload(body: unknown): GeneratePayload {
  if (Array.isArray(body)) return { items: body as NewsItemInput[] }
  if (body && typeof body === 'object' && Array.isArray((body as GeneratePayload).items)) {
    return body as GeneratePayload
  }
  throw new Error('Ожидается массив новостей или объект с полем items')
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/ut-config', (_req, res) => {
  res.json({ user_full_name: digestAuthorName() })
})

app.get('/api/images', async (_req, res) => {
  res.json(await store.list())
})

app.get('/api/images/:id', async (req, res) => {
  const image = await store.get(req.params.id)
  if (!image) {
    res.status(404).json({ error: 'Изображение не найдено' })
    return
  }
  res.setHeader('content-type', image.mimeType)
  res.setHeader('cache-control', 'public, max-age=31536000, immutable')
  res.send(image.data)
})

app.post('/api/images', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Файл не передан' })
    return
  }
  const mimeType = req.file.mimetype || 'image/jpeg'
  if (!mimeType.startsWith('image/')) {
    res.status(400).json({ error: 'Можно загружать только изображения' })
    return
  }
  const saved = await store.save({
    filename: req.file.originalname || 'image',
    mimeType,
    data: req.file.buffer,
  })
  res.json({
    id: saved.id,
    filename: saved.filename,
    mimeType: saved.mimeType,
    url: `/api/images/${saved.id}`,
    createdAt: saved.createdAt,
  })
})

app.post('/api/generate', async (req, res) => {
  try {
    const payload = normalizePayload(req.body)
    if (!payload.items.length) {
      res.status(400).json({ error: 'Нужна хотя бы одна новость' })
      return
    }
    assertPayloadScores(payload.items)
    const images = await Promise.all(payload.items.map((item) => resolveItemImage(item, store)))
    const buffer = await generateDigestDocx(payload, images)
    const { provision } = resolveCoverDates(payload.items, payload)
    const filename = digestFilename(provision)
    res.setHeader(
      'content-type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    res.setHeader(
      'content-disposition',
      `attachment; filename="digest.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
    res.send(buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось собрать документ'
    res.status(400).json({ error: message })
  }
})

app.listen(PORT, () => {
  console.log(`digest api on http://localhost:${PORT}`)
})
