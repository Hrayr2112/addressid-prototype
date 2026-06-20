import { useState } from 'react'
import {
  ORG_AGENT,
  ORG_AGENT_EMAIL,
  ORG_CATEGORY,
  ORG_NAME,
  useStore,
} from './store'
import type { Access, AddressType } from './types'
import { AccessStatusBadge, Modal, Timeline, formatDate, typeLabel } from './ui'
import { Checkbox } from './UserApp'

type View = 'home' | 'newrequest' | 'shared' | 'action' | 'changes' | 'account'

function isSnoozed(acc: Access) {
  return acc.snoozedUntil != null && new Date(acc.snoozedUntil) > new Date()
}

export function OrgApp({ onSignOut }: { onSignOut: () => void }) {
  const store = useStore()
  const [view, setView] = useState<View>('home')
  const [openAccess, setOpenAccess] = useState<string | null>(null)

  const mine = store.accesses.filter((a) => a.orgName === ORG_NAME)
  const shared = mine.filter((a) => a.status === 'active')
  const pending = store.requests.filter(
    (r) => r.orgName === ORG_NAME && r.status === 'pending',
  )
  const actionItems = mine.filter(
    (a) => a.status === 'inactive' && !isSnoozed(a),
  )
  const unreadChanges = store.changes.filter((c) => !c.read).length

  function go(v: View) {
    setView(v)
    setOpenAccess(null)
  }

  const detail = mine.find((a) => a.id === openAccess)
  const screenKey = openAccess ? `acc-${openAccess}` : view

  return (
    <div className="shell">
      <aside className="sidebar slide-in">
        <div className="sidebar-brand">
          <div className="logo-square">N</div>
          <div>
            <div className="name">{ORG_NAME}</div>
            <div className="role">Organization dashboard</div>
          </div>
        </div>
        <NavItem icon="📊" label="Overview" active={view === 'home'} onClick={() => go('home')} />
        <NavItem icon="➕" label="New Request" active={view === 'newrequest'} count={pending.length || undefined} countTone="neutral" onClick={() => go('newrequest')} />
        <NavItem icon="🔗" label="Shared" active={view === 'shared'} count={shared.length} countTone="neutral" onClick={() => go('shared')} />
        <NavItem icon="⚠️" label="Action Required" active={view === 'action'} count={actionItems.length || undefined} onClick={() => go('action')} />
        <NavItem icon="🕑" label="Recent Changes" active={view === 'changes'} count={unreadChanges || undefined} onClick={() => go('changes')} />
        <NavItem icon="🏢" label="My Account" active={view === 'account'} onClick={() => go('account')} />
        <div className="sidebar-foot">
          <NavItem icon="↩︎" label="Exit demo" onClick={onSignOut} />
        </div>
      </aside>

      <main className="main">
        <div className="screen" key={screenKey}>
          {detail ? (
            <AccessDetail access={detail} onBack={() => setOpenAccess(null)} />
          ) : view === 'home' ? (
            <Home shared={shared.length} pending={pending.length} actionItems={actionItems.length} unreadChanges={unreadChanges} go={go} />
          ) : view === 'newrequest' ? (
            <NewRequestView />
          ) : view === 'shared' ? (
            <SharedView accesses={shared} onOpen={setOpenAccess} />
          ) : view === 'action' ? (
            <ActionRequiredView items={actionItems} onOpen={setOpenAccess} />
          ) : view === 'changes' ? (
            <ChangesView onGoAction={() => go('action')} />
          ) : (
            <AccountView />
          )}
        </div>
      </main>
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  count,
  countTone,
  onClick,
}: {
  icon: string
  label: string
  active?: boolean
  count?: number
  countTone?: 'alert' | 'neutral'
  onClick: () => void
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="ico">{icon}</span>
      {label}
      {count ? (
        <span
          className="count"
          style={
            countTone === 'neutral'
              ? { background: 'var(--gray-soft)', color: 'var(--text-soft)' }
              : undefined
          }
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

// ---- Home ------------------------------------------------------------------

function Home({
  shared,
  pending,
  actionItems,
  unreadChanges,
  go,
}: {
  shared: number
  pending: number
  actionItems: number
  unreadChanges: number
  go: (v: View) => void
}) {
  return (
    <>
      <div className="page-head">
        <h1>{ORG_NAME}</h1>
        <p>An overview of your shared access and anything that needs attention.</p>
      </div>
      <div className="grid cols-2">
        <Stat label="Active sharing" value={shared} tone="green" onClick={() => go('shared')} />
        <Stat label="Pending requests" value={pending} tone="amber" onClick={() => go('newrequest')} />
        <Stat label="Action required" value={actionItems} tone="red" onClick={() => go('action')} />
        <Stat label="Unread changes" value={unreadChanges} tone="violet" onClick={() => go('changes')} />
      </div>
      <div className="section-title">Quick actions</div>
      <div className="card">
        <button className="btn primary" onClick={() => go('newrequest')}>
          + New Request
        </button>
      </div>
    </>
  )
}

function Stat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string
  value: number
  tone: 'green' | 'amber' | 'red' | 'violet'
  onClick: () => void
}) {
  const colors: Record<string, string> = {
    green: 'var(--green)',
    amber: 'var(--amber)',
    red: 'var(--red)',
    violet: 'var(--primary-dark)',
  }
  return (
    <div className="card clickable" onClick={onClick}>
      <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 800, color: colors[tone], marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}

// ---- New Request -----------------------------------------------------------

function NewRequestView() {
  const store = useStore()
  const [userId, setUserId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [physical, setPhysical] = useState(true)
  const [mailing, setMailing] = useState(false)
  const [sent, setSent] = useState(false)

  const pending = store.requests.filter(
    (r) => r.orgName === ORG_NAME && r.status === 'pending',
  )
  const valid = userId && firstName && lastName && (physical || mailing)
  const type: AddressType =
    physical && mailing ? 'both' : physical ? 'physical' : 'mailing'

  return (
    <>
      <div className="page-head">
        <h1>New Request</h1>
        <p>Request access to address information via the person's User ID.</p>
      </div>

      <div className="card">
        {sent && (
          <div className="banner violet">
            <span>✅</span>
            <span>Request sent. It now appears in Pending below.</span>
          </div>
        )}
        <div className="field">
          <label>User ID</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. USR-2048" />
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label>First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="field">
            <label>Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>What to request</label>
          <div className="check-row">
            <Checkbox checked={physical} onChange={setPhysical} label="Physical" />
            <Checkbox checked={mailing} onChange={setMailing} label="Mailing" />
          </div>
        </div>
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() => {
            store.sendRequest({ userId, firstName, lastName, requestType: type })
            setSent(true)
            setUserId('')
            setFirstName('')
            setLastName('')
          }}
        >
          Send request
        </button>
      </div>

      <div className="section-title">Pending</div>
      {pending.length === 0 ? (
        <div className="empty">No requests are pending.</div>
      ) : (
        <div className="grid">
          {pending.map((r) => (
            <div className="card" key={r.id}>
              <div className="row between">
                <div className="stack">
                  <strong>
                    {r.firstName} {r.lastName}
                  </strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {r.userId} · {typeLabel(r.requestType)} · {formatDate(r.sentAt)}
                  </span>
                </div>
                <span className="badge amber">Pending</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ---- Shared ----------------------------------------------------------------

function SharedView({
  accesses,
  onOpen,
}: {
  accesses: Access[]
  onOpen: (id: string) => void
}) {
  return (
    <>
      <div className="page-head">
        <h1>Shared</h1>
        <p>Address information currently shared with you.</p>
      </div>
      {accesses.length === 0 ? (
        <div className="empty">Nothing is shared with you yet.</div>
      ) : (
        <div className="grid">
          {accesses.map((acc) => (
            <AccessRow key={acc.id} access={acc} onOpen={onOpen} />
          ))}
        </div>
      )}
    </>
  )
}

function AccessRow({
  access,
  onOpen,
}: {
  access: Access
  onOpen: (id: string) => void
}) {
  const store = useStore()
  const addr = store.addressById(access.physicalAddressId ?? access.mailingAddressId)
  return (
    <div className="card clickable" onClick={() => onOpen(access.id)}>
      <div className="row between">
        <div className="stack">
          <strong>{access.personName}</strong>
          <span className="muted" style={{ fontSize: 12.5 }}>
            ID: {access.orgInternalUserId}
          </span>
        </div>
        <AccessStatusBadge status={access.status} />
      </div>
      <div className="divider" />
      <div className="row between wrap">
        <span className="addr-sub">
          {addr ? `${addr.line}, ${addr.city} ${addr.state}` : '—'}
        </span>
        <span className="tag">{typeLabel(access.requestType)}</span>
      </div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
        Since {formatDate(access.createdAt)}
      </div>
    </div>
  )
}

// ---- Access detail ---------------------------------------------------------

function AccessDetail({ access, onBack }: { access: Access; onBack: () => void }) {
  const store = useStore()
  const phys = store.addressById(access.physicalAddressId)
  const mail = store.addressById(access.mailingAddressId)
  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Back to Shared
      </button>
      <div className="card">
        <div className="row between">
          <div className="stack">
            <h2 style={{ fontSize: 20 }}>{access.personName}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {access.orgInternalUserId}
            </span>
          </div>
          <AccessStatusBadge status={access.status} />
        </div>
        {access.status === 'inactive' && (
          <div className="banner amber" style={{ marginTop: 16, marginBottom: 0 }}>
            <span>⚠️</span>
            <span>
              This sharing went Inactive. The last known address stays visible.
              You can request new access from Action Required.
            </span>
          </div>
        )}
        <div className="divider" />
        <div className="kv">
          <span className="k">Type</span>
          <span className="v">{typeLabel(access.requestType)}</span>
          {phys && (
            <>
              <span className="k">Physical address</span>
              <span className="v">{phys.line}, {phys.city} {phys.state} {phys.zip}</span>
            </>
          )}
          {mail && (
            <>
              <span className="k">Mailing address</span>
              <span className="v">{mail.line}, {mail.city} {mail.state} {mail.zip}</span>
            </>
          )}
          <span className="k">Since</span>
          <span className="v">{formatDate(access.createdAt)}</span>
          <span className="k">Status</span>
          <span className="v">
            <AccessStatusBadge status={access.status} />
          </span>
        </div>
      </div>
      <div className="section-title">Activity history</div>
      <div className="card">
        <Timeline items={access.history} />
      </div>
    </>
  )
}

// ---- Action Required -------------------------------------------------------

function ActionRequiredView({
  items,
  onOpen,
}: {
  items: Access[]
  onOpen: (id: string) => void
}) {
  const store = useStore()
  const [requestFor, setRequestFor] = useState<Access | null>(null)

  return (
    <>
      <div className="page-head">
        <h1>Action Required</h1>
        <p>Sharing that needs your attention.</p>
      </div>
      {items.length === 0 ? (
        <div className="empty">Nothing needs action right now 🎉</div>
      ) : (
        <div className="grid">
          {items.map((acc) => {
            const addr = store.addressById(acc.physicalAddressId ?? acc.mailingAddressId)
            return (
              <div className="card" key={acc.id}>
                <div className="row between">
                  <div className="stack" style={{ cursor: 'pointer' }} onClick={() => onOpen(acc.id)}>
                    <strong>{acc.personName}</strong>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {acc.orgInternalUserId} · {typeLabel(acc.requestType)}
                    </span>
                  </div>
                  <span className="badge red">Inactive</span>
                </div>
                <div className="banner amber" style={{ marginTop: 14, marginBottom: 14 }}>
                  <span>⚠️</span>
                  <span>
                    Status changed to Inactive. Last known address:{' '}
                    {addr ? `${addr.line}, ${addr.city}` : '—'}.
                  </span>
                </div>
                <div className="row wrap">
                  <button className="btn primary sm" onClick={() => setRequestFor(acc)}>
                    Request new access
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      store.snoozeAccess(acc.id, 7)
                      alert('Reminder set for 7 days. Removed from Action Required.')
                    }}
                  >
                    Snooze 7 days
                  </button>
                  <button
                    className="btn danger sm"
                    onClick={() => {
                      if (confirm('Close this access permanently?')) store.closeAccess(acc.id)
                    }}
                  >
                    Close access
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {requestFor && (
        <RequestNewModal access={requestFor} onClose={() => setRequestFor(null)} />
      )}
    </>
  )
}

function RequestNewModal({ access, onClose }: { access: Access; onClose: () => void }) {
  const store = useStore()
  const [first, setFirst] = useState(access.personName.split(' ')[0] ?? '')
  const [last, setLast] = useState(access.personName.split(' ')[1] ?? '')
  const [userId, setUserId] = useState('')
  const [physical, setPhysical] = useState(access.requestType !== 'mailing')
  const [mailing, setMailing] = useState(access.requestType !== 'physical')
  const valid = userId && first && last && (physical || mailing)
  const type: AddressType =
    physical && mailing ? 'both' : physical ? 'physical' : 'mailing'
  return (
    <Modal
      title="Request new access"
      subtitle="Send a fresh request to the user by User ID."
      onClose={onClose}
    >
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="field">
          <label>First name</label>
          <input value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div className="field">
          <label>Last name</label>
          <input value={last} onChange={(e) => setLast(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>User ID</label>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="e.g. USR-2048" />
      </div>
      <div className="field">
        <label>What to request</label>
        <div className="check-row">
          <Checkbox checked={physical} onChange={setPhysical} label="Physical" />
          <Checkbox checked={mailing} onChange={setMailing} label="Mailing" />
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() => {
            store.sendRequest({ userId, firstName: first, lastName: last, requestType: type })
            onClose()
            alert('New request sent. See Pending under New Request.')
          }}
        >
          Send request
        </button>
      </div>
    </Modal>
  )
}

// ---- Recent Changes --------------------------------------------------------

function ChangesView({ onGoAction }: { onGoAction: () => void }) {
  const store = useStore()
  return (
    <>
      <div className="page-head row between">
        <div>
          <h1>Recent Changes</h1>
          <p>Updates across your shared access.</p>
        </div>
        {store.changes.some((c) => !c.read) && (
          <button className="link-btn" onClick={store.markAllChangesRead}>
            Mark all as read
          </button>
        )}
      </div>
      <div className="grid">
        {store.changes.length === 0 && <div className="empty">No changes.</div>}
        {store.changes.map((c) => (
          <div
            key={c.id}
            className={`notif ${c.read ? '' : 'unread'}`}
            onClick={() => store.markChangeRead(c.id)}
          >
            {!c.read && <div className="unread-dot" />}
            <div style={{ flex: 1 }}>
              <div className="row between">
                <strong style={{ fontWeight: 600 }}>{c.text}</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {formatDate(c.date)}
                </span>
              </div>
              {c.link === 'action_required' && (
                <button
                  className="link-btn"
                  style={{ marginTop: 6 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    store.markChangeRead(c.id)
                    onGoAction()
                  }}
                >
                  Go to Action Required →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ---- Account ---------------------------------------------------------------

function AccountView() {
  return (
    <>
      <div className="page-head">
        <h1>My Account</h1>
        <p>Your organization and the agent managing this account.</p>
      </div>
      <div className="card">
        <div className="kv">
          <span className="k">Organization</span>
          <span className="v">{ORG_NAME}</span>
          <span className="k">Category</span>
          <span className="v">{ORG_CATEGORY}</span>
          <span className="k">Agent</span>
          <span className="v">{ORG_AGENT}</span>
          <span className="k">Email</span>
          <span className="v">{ORG_AGENT_EMAIL}</span>
          <span className="k">Role</span>
          <span className="v">Account manager</span>
        </div>
        <div className="divider" />
        <button className="btn ghost sm">Settings</button>
      </div>
    </>
  )
}
