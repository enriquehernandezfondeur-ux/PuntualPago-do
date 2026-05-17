'use client'
import { useState } from 'react'
import { OwnerProfile } from './OwnerProfile'
import type { Owner, OwnerPayout, Communication, Document } from '@/types/database'

interface Props {
  owner: Owner
  properties: any[]
  payouts: (OwnerPayout & { property: any })[]
  communications: Communication[]
  documents: Document[]
  portalActive: boolean
}

export function OwnerProfileWrapper(props: Props) {
  const [portalActive, setPortalActive] = useState(props.portalActive)

  async function handlePortalInvite() {
    const res = await fetch('/api/portal/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'owner', entityId: props.owner.id, email: props.owner.email }),
    })
    if (res.ok) setPortalActive(true)
  }

  return <OwnerProfile {...props} portalActive={portalActive} onPortalInvite={handlePortalInvite} />
}
