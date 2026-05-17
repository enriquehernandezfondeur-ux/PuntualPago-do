import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puntualpago.do'
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
  ]
}
