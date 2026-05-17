'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { MessageCircle, Mail, Phone, StickyNote, Send, Loader2, CheckCircle2 } from 'lucide-react'
import type { CommunicationChannel } from '@/types/database'

const CHANNELS: { key: CommunicationChannel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'nota_interna', label: 'Nota',      icon: StickyNote },
  { key: 'llamada',      label: 'Llamada',   icon: Phone },
  { key: 'whatsapp',     label: 'WhatsApp',  icon: MessageCircle },
  { key: 'email',        label: 'Email',     icon: Mail },
]

interface Props {
  tenantId?: string
  ownerId?: string
  propertyId?: string
}

export function QuickNote({ tenantId, ownerId, propertyId }: Props) {
  const [channel, setChannel] = useState<CommunicationChannel>('nota_interna')
  const [text, setText]       = useState('')
  const [subject, setSubject] = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    try {
      await supabase.from('communications').insert({
        channel,
        direction: 'outbound',
        subject: subject || (channel === 'llamada' ? 'Llamada registrada' : channel === 'nota_interna' ? 'Nota interna' : subject),
        content: text,
        tenant_id:   tenantId ?? null,
        owner_id:    ownerId  ?? null,
        property_id: propertyId ?? null,
        sent_at:     new Date().toISOString(),
        delivered:   true,
      })
      setText('')
      setSubject('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Añadir nota / registrar actividad</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Channel selector */}
        <div className="flex gap-1.5">
          {CHANNELS.map(c => (
            <button
              key={c.key}
              onClick={() => setChannel(c.key)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border"
              style={channel === c.key
                ? { background: '#EFF8FF', color: '#175CD3', borderColor: '#B2DDFF' }
                : { background: 'var(--surface-subtle)', color: 'var(--text-tertiary)', borderColor: 'var(--border)' }
              }
            >
              <c.icon className="w-3 h-3" /> {c.label}
            </button>
          ))}
        </div>

        {/* Subject (for email/whatsapp) */}
        {(channel === 'email' || channel === 'whatsapp') && (
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Asunto..."
            className="w-full px-3 py-2 rounded-lg text-xs border transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        )}

        {/* Note text */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={
            channel === 'nota_interna' ? 'Escribe una nota interna...'
            : channel === 'llamada'    ? 'Resumen de la llamada...'
            : channel === 'whatsapp'   ? 'Mensaje enviado por WhatsApp...'
            : 'Contenido del email...'
          }
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave() }}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none border transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />

        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>⌘+Enter para guardar</p>
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-50"
            style={{ background: saved ? '#12B76A' : '#1570EF' }}
          >
            {saving  ? <><Loader2 className="w-3 h-3 animate-spin" /> Guardando...</>
              : saved ? <><CheckCircle2 className="w-3 h-3" /> Guardado</>
              : <><Send className="w-3 h-3" /> Guardar</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
