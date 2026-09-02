export type NewsItemInput = {
  name: string
  short_description: string
  type: string
  applicability: string | number
  maturity: string | number
  implementation: string | number
  transformation: string | number
  link: string
  application_scope: string | string[]
  similar_services: string | string[]
  description: string
  image_url?: string
  image_id?: string
  provision_date?: string
  committee_date?: string
  extra_links?: string[]
}

export type DigestMeta = {
  provisionDate?: string
  periodStart?: string
  periodEnd?: string
  subtitle?: string
}

export type GeneratePayload = {
  items: NewsItemInput[]
} & DigestMeta

export type StoredImage = {
  id: string
  filename: string
  mimeType: string
  data: Buffer
  createdAt: string
}

export type StoredImageMeta = Omit<StoredImage, 'data'>
