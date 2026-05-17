'use client'
import { useState } from 'react'
import { TenantProfile } from './TenantProfile'
import type { Tenant, Payment, Lease, Communication, Document, LegalCase, MaintenanceRequest, RiskScore } from '@/types/database'

interface Props {
  tenant: Tenant
  leases: (Lease & { property: any })[]
  payments: Payment[]
  communications: Communication[]
  documents: Document[]
  legalCases: LegalCase[]
  maintenance: MaintenanceRequest[]
  riskScore?: RiskScore
  portalActive: boolean
}

export function TenantProfileWrapper(props: Props) {
  const [portalActive, setPortalActive] = useState(props.portalActive)
  const [inviting, setInviting]         = useState(false)

  async function handlePortalInvite() {
    if (inviting) return
    setInviting(true)
    try {
      const res = await fetch('/api/portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'tenant', entityId: props.tenant.id, email: props.tenant.email }),
      })
      if (res.ok) setPortalActive(true)
    } finally {
      setInviting(false)
    }
  }

  return (
    <TenantProfile
      {...props}
      portalActive={portalActive}
      onPortalInvite={handlePortalInvite}
    />
  )
}
