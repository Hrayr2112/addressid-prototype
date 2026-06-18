import { useState } from 'react'
import {
  PARTNER_AGENT,
  PARTNER_AGENT_EMAIL,
  PARTNER_NAME,
  useStore,
} from './store'
import type { Access, AddressType } from './types'
import {
  AccessStatusBadge,
  Modal,
  Timeline,
  formatDate,
  typeLabel,
} from './ui'

type View = 'home' | 'newaccess' | 'accesses' | 'action' | 'changes' | 'account'

function isSnoozed(acc: Access) {
  return acc.snoozedUntil != null && new Date(acc.snoozedUntil) > new Date()
}

export function PartnerApp({ onSignOut }: { onSignOut: () => void }) {
  const store = useStore()
  const [view, setView] = useState<View>('home')
  const [openAccess, setOpenAccess] = useState<string | null>(null)

  const myAccesses = store.accesses.filter((a) => a.partnerName === PARTNER_NAME)
  const pending = store.requests.filter(
    (r) => r.partnerName === PARTNER_NAME && r.status === 'pending',
  )
  const actionItems = myAccesses.filter(
    (a) => a.status === 'inactive' && !a.closed && !isSnoozed(a),
  )
  const unreadChanges = store.changes.filter((c) => !c.read).length

  function go(v: View) {
    setView(v)
    setOpenAccess(null)
  }

  const detail = myAccesses.find((a) => a.id === openAccess)
  const screenKey = openAccess ? `acc-${openAccess}` : view

  return (
    <div className="shell">
      <aside className="sidebar slide-in">
        <div className="sidebar-brand">
          <div className="logo-square">N</div>
          <div>
            <div className="name">{PARTNER_NAME}</div>
            <div className="role">Partner dashboard</div>
          </div>
        </div>
        <NavItem icon="📊" label="Overview" active={view === 'home'} onClick={() => go('home')} />
        <NavItem icon="➕" label="New Access" active={view === 'newaccess'} count={pending.length || undefined} countTone="neutral" onClick={() => go('newaccess')} />
        <NavItem icon="🔗" label="Accesses" active={view === 'accesses'} count={myAccesses.length} countTone="neutral" onClick={() => go('accesses')} />
        <NavItem icon="⚠️" label="Action Required" active={view === 'action'} count={actionItems.length || undefined} onClick={() => go('action')} />
        <NavItem icon="🕑" label="Recent Changes" active={view === 'changes'} count={unreadChanges || undefined} onClick={() => go('changes')} />
        <NavItem icon="🏢" label="My Account" active={view === 'account'} onClick={() => go('account')} />
        <div className="sidebar-foot">
          <NavItem icon="↩︎" label="Sign out" onClick={onSignOut} />
        </div>
      </aside>

      <main className="main">
        <div className="screen" key={screenKey}>
          {detail ? (
            <AccessDetail access={detail} onBack={() => setOpenAccess(null)} />
          ) : view === 'home' ? (
            <Home
              myAccesses={myAccesses}
              pending={pending.length}
              actionItems={actionItems.length}
              unreadChanges={unreadChanges}
              go={go}
            />
          ) : view === 'newaccess' ? (
            <NewAccessView />
          ) : view === 'accesses' ? (
            <AccessesView accesses={myAccesses} onOpen={setOpenAccess} />
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
  myAccesses,
  pending,
  actionItems,
  unreadChanges,
  go,
}: {
  myAccesses: Access[]
  pending: number
  actionItems: number
  unreadChanges: number
  go: (v: View) => void
}) {
  const active = myAccesses.filter((a) => a.status === 'active').length
  return (
    <>
      <div className="page-head">
        <h1>{PARTNER_NAME}</h1>
        <p>An overview of your accesses and anything that needs attention.</p>
      </div>
      <div className="grid cols-2">
        <Stat label="Active Accesses" value={active} tone="green" onClick={() => go('accesses')} />
        <Stat label="Pending requests" value={pending} tone="amber" onClick={() => go('newaccess')} />
        <Stat label="Action required" value={actionItems} tone="red" onClick={() => go('action')} />
        <Stat label="Unread changes" value={unreadChanges} tone="violet" onClick={() => go('changes')} />
      </div>
      <div className="section-title">Quick actions</div>
      <div className="card">
        <button className="btn primary" onClick={() => go('newaccess')}>
          + Request new Access
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

// ---- New Access ------------------------------------------------------------

function NewAccessView() {
  const store = useStore()
  const [addressId, setAddressId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [type, setType] = useState<AddressType>('physical')
  const [sent, setSent] = useState(false)

  const pending = store.requests.filter(
    (r) => r.partnerName === PARTNER_NAME && r.status === 'pending',
  )
  const valid = addressId && firstName && lastName

  return (
    <>
      <div className="page-head">
        <h1>New Access</h1>
        <p>Request access to an address via its Address ID and the user's name.</p>
      </div>

      <div className="card">
        {sent && (
          <div className="banner violet">
            <span>✅</span>
            <span>Request sent. It now appears in Pending below.</span>
          </div>
        )}
        <div className="field">
          <label>Address ID</label>
          <input
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            placeholder="e.g. ADR-7390"
          />
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
          <label>Request type</label>
          <div className="seg">
            {(['physical', 'mailing', 'both'] as AddressType[]).map((t) => (
              <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>
                {typeLabel(t)}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() => {
            store.sendRequest({ addressId, firstName, lastName, requestType: type })
            setSent(true)
            setAddressId('')
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
                    <span className="addr-id">{r.addressId}</span> ·{' '}
                    {typeLabel(r.requestType)} · {formatDate(r.sentAt)}
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

// ---- Accesses --------------------------------------------------------------

function AccessesView({
  accesses,
  onOpen,
}: {
  accesses: Access[]
  onOpen: (id: string) => void
}) {
  return (
    <>
      <div className="page-head">
        <h1>Accesses</h1>
        <p>All approved accesses.</p>
      </div>
      {accesses.length === 0 ? (
        <div className="empty">No approved Accesses yet.</div>
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
            ID: {access.partnerInternalUserId}
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
        Created {formatDate(access.createdAt)}
      </div>
    </div>
  )
}

// ---- Access detail ---------------------------------------------------------

function AccessDetail({
  access,
  onBack,
}: {
  access: Access
  onBack: () => void
}) {
  const store = useStore()
  const phys = store.addressById(access.physicalAddressId)
  const mail = store.addressById(access.mailingAddressId)

  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Back to Accesses
      </button>
      <div className="card">
        <div className="row between">
          <div className="stack">
            <h2 style={{ fontSize: 20 }}>{access.personName}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {access.partnerInternalUserId}
            </span>
          </div>
          <AccessStatusBadge status={access.status} />
        </div>
        {access.status === 'inactive' && !access.closed && (
          <div className="banner amber" style={{ marginTop: 16, marginBottom: 0 }}>
            <span>⚠️</span>
            <span>
              This Access went Inactive. The last known address stays visible. You
              can request a new Access from Action Required.
            </span>
          </div>
        )}
        <div className="divider" />
        <div className="kv">
          <span className="k">Address type</span>
          <span className="v">{typeLabel(access.requestType)}</span>
          {phys && (
            <>
              <span className="k">Physical address</span>
              <span className="v">
                {phys.line}, {phys.city} {phys.state} {phys.zip}
              </span>
            </>
          )}
          {mail && (
            <>
              <span className="k">Mailing address</span>
              <span className="v">
                {mail.line}, {mail.city} {mail.state} {mail.zip}
              </span>
            </>
          )}
          <span className="k">Created</span>
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
        <p>Accesses that need your attention.</p>
      </div>
      {items.length === 0 ? (
        <div className="empty">Nothing needs action right now 🎉</div>
      ) : (
        <div className="grid">
          {items.map((acc) => {
            const addr = store.addressById(
              acc.physicalAddressId ?? acc.mailingAddressId,
            )
            return (
              <div className="card" key={acc.id}>
                <div className="row between">
                  <div
                    className="stack"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onOpen(acc.id)}
                  >
                    <strong>{acc.personName}</strong>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {acc.partnerInternalUserId} · {typeLabel(acc.requestType)}
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
                    Request new Access
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      store.snoozeAccess(acc.id, 7)
                      alert('Reminder set for 7 days. This Access was removed from Action Required.')
                    }}
                  >
                    Snooze 7 days
                  </button>
                  <button
                    className="btn danger sm"
                    onClick={() => {
                      if (confirm('Close this Access permanently?'))
                        store.closeAccess(acc.id)
                    }}
                  >
                    Close Access
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {requestFor && (
        <RequestNewAccessModal
          access={requestFor}
          onClose={() => setRequestFor(null)}
        />
      )}
    </>
  )
}

function RequestNewAccessModal({
  access,
  onClose,
}: {
  access: Access
  onClose: () => void
}) {
  const store = useStore()
  const [first, setFirst] = useState(access.personName.split(' ')[0] ?? '')
  const [last, setLast] = useState(access.personName.split(' ')[1] ?? '')
  const [addressId, setAddressId] = useState('')
  return (
    <Modal
      title="Request new Access"
      subtitle="Send a fresh request to the user by Address ID."
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
        <label>Address ID</label>
        <input
          value={addressId}
          onChange={(e) => setAddressId(e.target.value)}
          placeholder="e.g. ADR-2255"
        />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!addressId || !first || !last}
          onClick={() => {
            store.sendRequest({
              addressId,
              firstName: first,
              lastName: last,
              requestType: access.requestType,
            })
            onClose()
            alert('New request sent. See Pending under New Access.')
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
          <p>Updates across your Accesses.</p>
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
        <p>Your brand and the agent managing this account.</p>
      </div>
      <div className="card">
        <div className="kv">
          <span className="k">Brand</span>
          <span className="v">{PARTNER_NAME}</span>
          <span className="k">Agent</span>
          <span className="v">{PARTNER_AGENT}</span>
          <span className="k">Email</span>
          <span className="v">{PARTNER_AGENT_EMAIL}</span>
          <span className="k">Role</span>
          <span className="v">Account manager</span>
        </div>
        <div className="divider" />
        <button className="btn ghost sm">Login / Settings</button>
      </div>
    </>
  )
}
