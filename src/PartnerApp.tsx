import { useState } from 'react'
import {
  ORG_AGENT,
  ORG_AGENT_EMAIL,
  ORG_CATEGORY,
  ORG_NAME,
  useStore,
} from './store'
import type { Access, AccessRequest, AddressType } from './types'
import { AccessStatusBadge, Modal, Timeline, formatDate, typeLabel } from './ui'
import { Checkbox } from './UserApp'

type View = 'notifications' | 'newrequest' | 'share' | 'action' | 'pending' | 'account'
type ActionTab = 'new' | 'snoozed' | 'closed'
type SearchMode = 'name' | 'userid'

function isSnoozed(acc: Access) {
  return acc.snoozedUntil != null && new Date(acc.snoozedUntil) > new Date()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function matchClient(a: Access, q: string, mode: SearchMode) {
  if (!q.trim()) return true
  const s = q.toLowerCase()
  return mode === 'userid'
    ? a.orgInternalUserId.toLowerCase().includes(s)
    : a.personName.toLowerCase().includes(s)
}

function addrOf(store: ReturnType<typeof useStore>, acc: Access) {
  const a = store.addressById(acc.physicalAddressId ?? acc.mailingAddressId)
  if (a) return `${a.line}${a.unit ? ', ' + a.unit : ''}, ${a.city} ${a.state}`
  return acc.addressLabel ?? '—'
}

export function OrgApp({ onSignOut }: { onSignOut: () => void }) {
  const store = useStore()
  const [view, setView] = useState<View>('notifications')
  const [openAccess, setOpenAccess] = useState<string | null>(null)

  const mine = store.accesses.filter((a) => a.orgName === ORG_NAME)
  const shared = mine.filter((a) => a.status === 'active')
  const pending = store.requests.filter(
    (r) => r.orgName === ORG_NAME && r.status === 'pending',
  )
  const newAction = mine.filter((a) => a.status === 'inactive' && !isSnoozed(a))
  const unreadChanges = store.changes.filter((c) => !c.read).length

  function go(v: View) {
    setView(v)
    setOpenAccess(null)
  }

  function openClient(id: string) {
    setOpenAccess(id)
    setView('share')
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
        <NavItem icon="🔔" label="Notifications" active={view === 'notifications'} count={unreadChanges || undefined} onClick={() => go('notifications')} />
        <NavItem icon="➕" label="New Request" active={view === 'newrequest'} onClick={() => go('newrequest')} />
        <NavItem icon="🔗" label="Share" active={view === 'share'} count={shared.length} countTone="neutral" onClick={() => go('share')} />
        <NavItem icon="⚠️" label="Action Required" active={view === 'action'} count={newAction.length || undefined} onClick={() => go('action')} />
        <NavItem icon="🕓" label="Pending" active={view === 'pending'} count={pending.length || undefined} countTone="neutral" onClick={() => go('pending')} />
        <NavItem icon="🏢" label="My Account" active={view === 'account'} onClick={() => go('account')} />
        <div className="sidebar-foot">
          <NavItem icon="↩︎" label="Exit demo" onClick={onSignOut} />
        </div>
      </aside>

      <main className="main">
        <div className="screen" key={screenKey}>
          {detail ? (
            <AccessDetail access={detail} onBack={() => setOpenAccess(null)} />
          ) : view === 'notifications' ? (
            <NotificationsView onOpenClient={openClient} onGo={go} />
          ) : view === 'newrequest' ? (
            <NewRequestView />
          ) : view === 'share' ? (
            <ShareView accesses={shared} onOpen={openClient} />
          ) : view === 'action' ? (
            <ActionRequiredView onOpen={openClient} />
          ) : view === 'pending' ? (
            <PendingView />
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

// ---- Search bar ------------------------------------------------------------

function SearchBar({
  value,
  onChange,
  mode,
  onMode,
}: {
  value: string
  onChange: (v: string) => void
  mode?: SearchMode
  onMode?: (m: SearchMode) => void
}) {
  return (
    <div className="searchbar">
      <input
        className="search-input"
        placeholder="Search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {mode && onMode && (
        <div className="seg-toggle">
          <button className={mode === 'name' ? 'on' : ''} onClick={() => onMode('name')}>
            By name
          </button>
          <button className={mode === 'userid' ? 'on' : ''} onClick={() => onMode('userid')}>
            By User ID
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Notifications (default) ----------------------------------------------

function NotificationsView({
  onOpenClient,
  onGo,
}: {
  onOpenClient: (id: string) => void
  onGo: (v: View) => void
}) {
  const store = useStore()
  const [q, setQ] = useState('')
  const list = store.changes.filter((c) =>
    !q.trim() ? true : c.text.toLowerCase().includes(q.toLowerCase()),
  )

  function open(c: (typeof store.changes)[number]) {
    store.markChangeRead(c.id)
    if (c.accessId && store.accesses.some((a) => a.id === c.accessId)) {
      onOpenClient(c.accessId)
    } else if (c.section) {
      onGo(c.section === 'action_required' ? 'action' : 'pending')
    }
  }

  return (
    <>
      <div className="page-head row between">
        <div>
          <h1>Notifications</h1>
          <p>A log of everything that happened. Click an item to open it.</p>
        </div>
        {store.changes.some((c) => !c.read) && (
          <button className="link-btn" onClick={store.markAllChangesRead}>
            Mark all as read
          </button>
        )}
      </div>
      <SearchBar value={q} onChange={setQ} />
      <div className="grid" style={{ marginTop: 16 }}>
        {list.length === 0 && <div className="empty">No notifications.</div>}
        {list.map((c) => (
          <div
            key={c.id}
            className={`notif clickable ${c.read ? '' : 'unread'}`}
            onClick={() => open(c)}
          >
            {!c.read && <div className="unread-dot" />}
            <div style={{ flex: 1 }}>
              <div className="row between">
                <strong style={{ fontWeight: 600 }}>{c.text}</strong>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {formatDate(c.date)}
                </span>
              </div>
              <span className="link-btn" style={{ fontSize: 13 }}>
                {c.accessId ? 'Open in Share →' : c.section === 'action_required' ? 'Go to Action Required →' : 'Open →'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
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
            <span>Request sent. You can track it under Pending.</span>
          </div>
        )}
        <div className="field">
          <label>User ID</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} />
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
    </>
  )
}

// ---- Share -----------------------------------------------------------------

function ShareView({
  accesses,
  onOpen,
}: {
  accesses: Access[]
  onOpen: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const list = accesses.filter((a) => matchClient(a, q, mode))

  return (
    <>
      <div className="page-head">
        <h1>Share</h1>
        <p>Address information currently shared with you ({accesses.length}).</p>
      </div>
      <SearchBar value={q} onChange={setQ} mode={mode} onMode={setMode} />
      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          No clients match your search.
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {list.map((acc) => (
            <div className="card clickable" key={acc.id} onClick={() => onOpen(acc.id)}>
              <div className="row between">
                <div className="stack" style={{ gap: 2 }}>
                  <strong>{acc.personName}</strong>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {acc.orgInternalUserId}
                  </span>
                </div>
                <AccessStatusBadge status={acc.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ---- Access detail ---------------------------------------------------------

function AccessDetail({ access, onBack }: { access: Access; onBack: () => void }) {
  const store = useStore()
  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Back
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
          <span className="k">Address</span>
          <span className="v">{addrOf(store, access)}</span>
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

function ActionRequiredView({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const [tab, setTab] = useState<ActionTab>('new')
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const [requestFor, setRequestFor] = useState<Access | null>(null)
  const [snoozeFor, setSnoozeFor] = useState<Access | null>(null)

  const mine = store.accesses.filter((a) => a.orgName === ORG_NAME)
  const newItems = mine.filter((a) => a.status === 'inactive' && !isSnoozed(a))
  const snoozedItems = mine.filter((a) => a.status === 'inactive' && isSnoozed(a))
  const closedItems = mine.filter((a) => a.status === 'closed')

  const source = tab === 'new' ? newItems : tab === 'snoozed' ? snoozedItems : closedItems
  const list = source.filter((a) => matchClient(a, q, mode))

  return (
    <>
      <div className="page-head">
        <h1>Action Required</h1>
        <p>Sharing that needs your attention.</p>
      </div>

      <div className="seg-toggle" style={{ marginBottom: 14 }}>
        <button className={tab === 'new' ? 'on' : ''} onClick={() => setTab('new')}>
          New{newItems.length > 0 && <span className="pill-count">{newItems.length}</span>}
        </button>
        <button className={tab === 'snoozed' ? 'on' : ''} onClick={() => setTab('snoozed')}>
          Snoozed{snoozedItems.length > 0 && <span className="pill-count amber">{snoozedItems.length}</span>}
        </button>
        <button className={tab === 'closed' ? 'on' : ''} onClick={() => setTab('closed')}>
          Closed
        </button>
      </div>

      <SearchBar value={q} onChange={setQ} mode={mode} onMode={setMode} />

      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>Nothing here.</div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {list.map((acc) => (
            <div className="card" key={acc.id}>
              <div className="row between">
                <div className="stack" style={{ cursor: 'pointer' }} onClick={() => onOpen(acc.id)}>
                  <strong>{acc.personName}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {acc.orgInternalUserId} · {typeLabel(acc.requestType)}
                  </span>
                </div>
                <AccessStatusBadge status={acc.status} />
              </div>

              {tab === 'snoozed' && acc.snoozedUntil && (
                <div className="banner violet" style={{ marginTop: 12, marginBottom: 0 }}>
                  <span>⏰</span>
                  <span>Reminder set for {formatDateTime(acc.snoozedUntil)}.</span>
                </div>
              )}

              {tab !== 'closed' && (
                <>
                  <div className="banner amber" style={{ marginTop: 12, marginBottom: 14 }}>
                    <span>⚠️</span>
                    <span>Last known address: {addrOf(store, acc)}.</span>
                  </div>
                  <div className="row wrap">
                    <button className="btn primary sm" onClick={() => setRequestFor(acc)}>
                      Request new access
                    </button>
                    {tab === 'new' ? (
                      <button className="btn ghost sm" onClick={() => setSnoozeFor(acc)}>
                        Snooze
                      </button>
                    ) : (
                      <button className="btn ghost sm" onClick={() => store.unsnoozeAccess(acc.id)}>
                        Resume
                      </button>
                    )}
                    <button
                      className="btn danger sm"
                      onClick={() => {
                        if (confirm('Close this access permanently?')) store.closeAccess(acc.id)
                      }}
                    >
                      Close access
                    </button>
                  </div>
                </>
              )}

              {tab === 'closed' && (
                <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                  Closed · last known address: {addrOf(store, acc)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {requestFor && (
        <RequestNewModal access={requestFor} onClose={() => setRequestFor(null)} />
      )}
      {snoozeFor && (
        <SnoozeModal access={snoozeFor} onClose={() => setSnoozeFor(null)} />
      )}
    </>
  )
}

function SnoozeModal({ access, onClose }: { access: Access; onClose: () => void }) {
  const store = useStore()
  // default: tomorrow 09:00, formatted for datetime-local input
  const def = (() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
    d.setHours(9, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })()
  const [when, setWhen] = useState(def)
  return (
    <Modal
      title="Snooze reminder"
      subtitle={`${access.personName} · ${access.orgInternalUserId}`}
      onClose={onClose}
    >
      <div className="field">
        <label>Remind me on</label>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!when}
          onClick={() => {
            store.snoozeAccess(access.id, new Date(when).toISOString())
            onClose()
          }}
        >
          Set reminder
        </button>
      </div>
    </Modal>
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
        <input value={userId} onChange={(e) => setUserId(e.target.value)} />
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
            alert('New request sent. See Pending.')
          }}
        >
          Send request
        </button>
      </div>
    </Modal>
  )
}

// ---- Pending ---------------------------------------------------------------

function PendingView() {
  const store = useStore()
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<SearchMode>('name')
  const pending = store.requests.filter(
    (r) => r.orgName === ORG_NAME && r.status === 'pending',
  )
  const match = (r: AccessRequest) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return mode === 'userid'
      ? r.userId.toLowerCase().includes(s)
      : `${r.firstName} ${r.lastName}`.toLowerCase().includes(s)
  }
  const list = pending.filter(match)

  return (
    <>
      <div className="page-head">
        <h1>Pending</h1>
        <p>Requests waiting for the user to approve.</p>
      </div>
      <SearchBar value={q} onChange={setQ} mode={mode} onMode={setMode} />
      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No pending requests.</div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {list.map((r) => (
            <div className="card" key={r.id}>
              <div className="row between">
                <div className="stack">
                  <strong>{r.firstName} {r.lastName}</strong>
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
