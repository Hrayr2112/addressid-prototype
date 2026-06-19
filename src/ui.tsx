import type { ReactNode } from 'react'
import type { AccessStatus, AddressStatus, AddressType } from './types'

export function typeLabel(t: AddressType): string {
  if (t === 'both') return 'Physical + Mailing'
  if (t === 'physical') return 'Physical'
  return 'Mailing'
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AddressTypeBadge({ type }: { type: AddressType }) {
  return <span className="badge violet no-dot">{typeLabel(type)}</span>
}

export function AddressStatusBadge({ status }: { status: AddressStatus }) {
  if (status === 'active') return <span className="badge green">Active</span>
  if (status === 'pending')
    return <span className="badge amber">Pending</span>
  return <span className="badge gray">Inactive</span>
}

export function SharingBadge() {
  return <span className="badge green">Sharing</span>
}

export function AccessStatusBadge({ status }: { status: AccessStatus }) {
  if (status === 'active') return <span className="badge green">Sharing</span>
  if (status === 'inactive') return <span className="badge red">Inactive</span>
  if (status === 'stopped') return <span className="badge gray">Stopped</span>
  return <span className="badge gray">Closed</span>
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {subtitle && <div className="sub">{subtitle}</div>}
        {children}
      </div>
    </div>
  )
}

export function Timeline({
  items,
}: {
  items: { id: string; date: string; type: string; status?: string }[]
}) {
  return (
    <div className="timeline">
      {items
        .slice()
        .reverse()
        .map((h) => (
          <div className="tl-item" key={h.id}>
            <div className="tl-dot" />
            <div className="tl-body">
              <div className="t">
                {h.type}
                {h.status ? `: ${h.status}` : ''}
              </div>
              <div className="d">{formatDate(h.date)}</div>
            </div>
          </div>
        ))}
    </div>
  )
}
