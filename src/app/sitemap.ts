import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puntualpago.do'
  return [
    { url: base,                   lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: `${base}/#garantia`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/#plataforma`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/#nosotros`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/#faq`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]
}
