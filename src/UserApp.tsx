import { useMemo, useState } from 'react'
import {
  ACCOUNT_PASSWORD,
  BRAND_NAME,
  USER_EMAIL,
  USER_FIRST,
  USER_ID,
  USER_LAST,
  USER_NAME,
  USER_PHONE,
  useStore,
} from './store'
import type { Access, Address, AddressStatus } from './types'
import {
  AccessStatusBadge,
  AddressStatusBadge,
  Modal,
  SharingBadge,
  Timeline,
  formatDate,
  typeLabel,
} from './ui'

type View = 'addresses' | 'shared' | 'account'
type ShareTab = 'sharings' | 'requests'

function addrText(a?: Address) {
  if (!a) return '—'
  return a.unit ? `${a.line}, ${a.unit}` : a.line
}

export function UserApp({ onSignOut }: { onSignOut: () => void }) {
  const store = useStore()
  const [view, setView] = useState<View>('addresses')
  const [shareTab, setShareTab] = useState<ShareTab>('sharings')
  const [openAddress, setOpenAddress] = useState<string | null>(null)
  const [openAccess, setOpenAccess] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [approveReq, setApproveReq] = useState<string | null>(null)

  const unreadNotes = store.notifications.filter((n) => !n.read).length
  const pendingReqs = store.requests.filter((r) => r.status === 'pending').length

  function go(v: View) {
    setView(v)
    setOpenAddress(null)
    setOpenAccess(null)
  }

  function goToRequests() {
    setView('shared')
    setShareTab('requests')
    setOpenAddress(null)
    setOpenAccess(null)
  }

  const detailAddress = store.addressById(openAddress ?? undefined)
  const detailAccess = store.accesses.find((a) => a.id === openAccess)
  const screenKey = openAddress
    ? `addr-${openAddress}`
    : openAccess
      ? `acc-${openAccess}`
      : view === 'shared'
        ? `shared-${shareTab}`
        : view

  return (
    <div className="shell">
      <aside className="sidebar slide-in">
        <div className="sidebar-brand">
          <img src="./pin.svg" alt="" />
          <div>
            <div className="name">{BRAND_NAME}</div>
            <div className="role">{USER_NAME}</div>
          </div>
        </div>
        <NavItem
          icon="🏠"
          label="My Addresses"
          active={view === 'addresses' && !openAddress && !openAccess}
          count={unreadNotes || undefined}
          onClick={() => go('addresses')}
        />
        <NavItem
          icon="🔗"
          label="Share"
          active={view === 'shared'}
          count={pendingReqs || undefined}
          onClick={() => go('shared')}
        />
        <NavItem
          icon="👤"
          label="My Account"
          active={view === 'account'}
          onClick={() => go('account')}
        />
        <div className="sidebar-foot">
          <NavItem icon="↩︎" label="Exit demo" onClick={onSignOut} />
        </div>
      </aside>

      <main className="main wide">
        <div className="screen" key={screenKey}>
          {detailAddress ? (
            <AddressDetail
              address={detailAddress}
              onBack={() => setOpenAddress(null)}
              onOpenAccess={(id) => {
                setOpenAddress(null)
                setView('shared')
                setShareTab('sharings')
                setOpenAccess(id)
              }}
            />
          ) : detailAccess ? (
            <AccessDetail access={detailAccess} onBack={() => setOpenAccess(null)} />
          ) : view === 'addresses' ? (
            <Dashboard
              onAdd={() => setShowAddForm(true)}
              onOpen={(id) => setOpenAddress(id)}
              onOpenRequests={goToRequests}
            />
          ) : view === 'shared' ? (
            <ShareView
              tab={shareTab}
              onTab={setShareTab}
              onOpen={(id) => setOpenAccess(id)}
              onApprove={(id) => setApproveReq(id)}
            />
          ) : (
            <AccountView />
          )}
        </div>
      </main>

      {showAddForm && <AddAddressModal onClose={() => setShowAddForm(false)} />}
      {approveReq && (
        <ApproveModal
          requestId={approveReq}
          onClose={() => setApproveReq(null)}
          onDone={() => setApproveReq(null)}
        />
      )}
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

// ---- helpers ---------------------------------------------------------------

function activeSharedCounts(accesses: Access[], id: string) {
  return {
    phys: accesses.filter((a) => a.status === 'active' && a.physicalAddressId === id).length,
    mail: accesses.filter((a) => a.status === 'active' && a.mailingAddressId === id).length,
  }
}

function activeOfType(addresses: Address[], need: 'physical' | 'mailing') {
  return addresses.filter(
    (a) => a.status === 'active' && (a.type === need || a.type === 'both'),
  )
}

// ---- Dashboard (My Addresses) ---------------------------------------------

function Dashboard({
  onAdd,
  onOpen,
  onOpenRequests,
}: {
  onAdd: () => void
  onOpen: (id: string) => void
  onOpenRequests: () => void
}) {
  const store = useStore()
  const [filter, setFilter] = useState<AddressStatus>('active')

  const counts = {
    active: store.addresses.filter((a) => a.status === 'active').length,
    pending: store.addresses.filter((a) => a.status === 'pending').length,
    inactive: store.addresses.filter((a) => a.status === 'inactive').length,
  }
  const list = store.addresses.filter((a) => a.status === filter)

  return (
    <>
      <div className="page-head">
        <h1>My Addresses</h1>
        <p>Manage your addresses and the access you grant to organizations.</p>
      </div>

      <div className="dash">
        {/* LEFT — addresses */}
        <div className="dash-left">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div className="seg-toggle">
              {(['active', 'pending', 'inactive'] as AddressStatus[]).map((s) => (
                <button
                  key={s}
                  className={filter === s ? 'on' : ''}
                  onClick={() => setFilter(s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                  {s === 'pending' && counts.pending > 0 && (
                    <span className="pill-count amber">{counts.pending}</span>
                  )}
                </button>
              ))}
            </div>
            <button className="btn primary sm" onClick={onAdd}>
              + Add
            </button>
          </div>

          {list.length === 0 ? (
            <div className="empty">No {filter} addresses.</div>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {list.map((a) => (
                <AddressCard key={a.id} address={a} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — notifications */}
        <div className="dash-right">
          <NotificationsPanel onOpenRequests={onOpenRequests} />
        </div>
      </div>
    </>
  )
}

function AddressCard({
  address,
  onOpen,
}: {
  address: Address
  onOpen: (id: string) => void
}) {
  const store = useStore()
  const { phys, mail } = activeSharedCounts(store.accesses, address.id)
  return (
    <div className="card clickable" onClick={() => onOpen(address.id)}>
      <div className="row between">
        <div className="addr-line" style={{ marginTop: 0 }}>
          {addrText(address)}
        </div>
        <AddressStatusBadge status={address.status} />
      </div>
      <div className="addr-sub">
        {address.city}, {address.state} {address.zip}
      </div>
      <div className="divider" />
      <div className="row wrap" style={{ gap: 8 }}>
        {(address.type === 'physical' || address.type === 'both') && (
          <span className="type-chip">
            Physical <span className="chip-count">{phys} shared</span>
          </span>
        )}
        {(address.type === 'mailing' || address.type === 'both') && (
          <span className="type-chip">
            Mailing <span className="chip-count">{mail} shared</span>
          </span>
        )}
      </div>
    </div>
  )
}

function NotificationsPanel({ onOpenRequests }: { onOpenRequests: () => void }) {
  const store = useStore()
  const unread = store.notifications.filter((n) => !n.read).length
  return (
    <div className="panel">
      <div className="panel-head">
        <span>Notifications</span>
        {unread > 0 && <span className="pill-count">{unread}</span>}
        {unread > 0 && (
          <button
            className="link-btn"
            style={{ marginLeft: 'auto', fontSize: 13 }}
            onClick={store.markAllNotificationsRead}
          >
            Mark all read
          </button>
        )}
      </div>
      {store.notifications.length === 0 ? (
        <div className="panel-empty">No recent activity.</div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {store.notifications.map((n) => {
            const isRequest = n.kind === 'request'
            return (
              <div
                key={n.id}
                className={`notif ${n.read ? '' : 'unread'} ${isRequest ? 'clickable' : ''}`}
                onClick={() => {
                  store.markNotificationRead(n.id)
                  if (isRequest) onOpenRequests()
                }}
              >
                {!n.read && <div className="unread-dot" />}
                <div style={{ flex: 1 }}>
                  <div className="row between">
                    <div className="row" style={{ gap: 8 }}>
                      {isRequest && <span className="mini-tag">Request</span>}
                      <strong style={{ fontSize: 14 }}>
                        {n.orgName ?? n.title}
                      </strong>
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {formatDate(n.date)}
                    </span>
                  </div>
                  <div className="addr-sub" style={{ marginTop: 2 }}>
                    {isRequest ? n.body : `${n.title} — ${n.body}`}
                  </div>
                  {isRequest && (
                    <span className="link-btn" style={{ fontSize: 13 }}>
                      View in Requests →
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Address detail --------------------------------------------------------

function AddressDetail({
  address,
  onBack,
  onOpenAccess,
}: {
  address: Address
  onBack: () => void
  onOpenAccess: (id: string) => void
}) {
  const store = useStore()
  const [manage, setManage] = useState<Access | null>(null)
  const [deactivate, setDeactivate] = useState(false)

  const sharedTo = store.accesses.filter(
    (acc) =>
      acc.status === 'active' &&
      (acc.physicalAddressId === address.id || acc.mailingAddressId === address.id),
  )
  const previous = store.previousSharings.filter((p) => p.addressId === address.id)

  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Back to addresses
      </button>
      <div className="card">
        <div className="row between">
          <div className="addr-line" style={{ fontSize: 20, marginTop: 0 }}>
            {addrText(address)}
          </div>
          <AddressStatusBadge status={address.status} />
        </div>
        <div className="addr-sub">
          {address.city}, {address.state} {address.zip}
        </div>
        <div className="divider" />
        <div className="kv">
          <span className="k">Address type</span>
          <span className="v">{typeLabel(address.type)}</span>
          <span className="k">Status</span>
          <span className="v">
            <AddressStatusBadge status={address.status} />
          </span>
        </div>
        {address.status === 'active' && (
          <>
            <div className="divider" />
            <button className="btn danger sm" onClick={() => setDeactivate(true)}>
              Deactivate
            </button>
          </>
        )}
      </div>

      <div className="section-title">Shared to</div>
      {sharedTo.length === 0 ? (
        <div className="empty">This address is not shared with anyone.</div>
      ) : (
        <div className="grid">
          {sharedTo.map((acc) => (
            <div className="card" key={acc.id}>
              <div className="row between">
                <div
                  className="stack"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onOpenAccess(acc.id)}
                >
                  <strong>{acc.orgName}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {typeLabel(acc.requestType)} · since {formatDate(acc.createdAt)}
                  </span>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <SharingBadge />
                  <button className="btn ghost sm" onClick={() => setManage(acc)}>
                    Stop / Change
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title">Previous sharing</div>
      {previous.length === 0 ? (
        <div className="empty">No previous sharing for this address.</div>
      ) : (
        <div className="grid">
          {previous.map((p) => (
            <div className="card muted-card" key={p.id}>
              <div className="row between">
                <div className="stack">
                  <strong>{p.orgName}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {typeLabel(p.requestType)} · {reasonLabel(p.reason)} ·{' '}
                    {formatDate(p.date)}
                  </span>
                </div>
                <span className="badge gray">Ended</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {manage && (
        <ManageSharingModal access={manage} onClose={() => setManage(null)} />
      )}
      {deactivate && (
        <DeactivateModal address={address} onClose={() => setDeactivate(false)} />
      )}
    </>
  )
}

function reasonLabel(r: 'stopped' | 'changed' | 'deactivated') {
  if (r === 'stopped') return 'stopped by you'
  if (r === 'changed') return 'moved to another address'
  return 'address deactivated'
}

// ---- Manage sharing (Stop / Change) ---------------------------------------

function ManageSharingModal({
  access,
  onClose,
}: {
  access: Access
  onClose: () => void
}) {
  const store = useStore()
  const [mode, setMode] = useState<'menu' | 'change'>('menu')
  const needPhys = access.requestType !== 'mailing'
  const needMail = access.requestType !== 'physical'
  const physOptions = activeOfType(store.addresses, 'physical')
  const mailOptions = activeOfType(store.addresses, 'mailing')
  const [phys, setPhys] = useState(access.physicalAddressId ?? physOptions[0]?.id ?? '')
  const [mail, setMail] = useState(access.mailingAddressId ?? mailOptions[0]?.id ?? '')

  return (
    <Modal
      title="Manage sharing"
      subtitle={`${access.orgName} · ${typeLabel(access.requestType)}`}
      onClose={onClose}
    >
      {mode === 'menu' ? (
        <div className="stack" style={{ gap: 12 }}>
          <button
            className="choice"
            onClick={() => {
              store.stopSharing(access.id)
              onClose()
            }}
          >
            <span className="choice-title">Stop sharing</span>
            <span className="choice-desc">
              End this sharing. It will move to Previous sharing.
            </span>
          </button>
          <button className="choice" onClick={() => setMode('change')}>
            <span className="choice-title">Change to another address</span>
            <span className="choice-desc">
              Switch this sharing to a different active address. The organization
              sees the update automatically.
            </span>
          </button>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {needPhys && (
            <div className="field">
              <label>Physical address</label>
              <select value={phys} onChange={(e) => setPhys(e.target.value)}>
                {physOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {addrText(a)} — {a.city}, {a.state}
                  </option>
                ))}
              </select>
            </div>
          )}
          {needMail && (
            <div className="field">
              <label>Mailing address</label>
              <select value={mail} onChange={(e) => setMail(e.target.value)}>
                {mailOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {addrText(a)} — {a.city}, {a.state}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={() => setMode('menu')}>
              Back
            </button>
            <button
              className="btn primary"
              onClick={() => {
                store.changeSharingAddress(access.id, {
                  physicalAddressId: needPhys ? phys : undefined,
                  mailingAddressId: needMail ? mail : undefined,
                })
                onClose()
              }}
            >
              Save change
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

// ---- Deactivate (with password confirmation) ------------------------------

function DeactivateModal({
  address,
  onClose,
}: {
  address: Address
  onClose: () => void
}) {
  const store = useStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  return (
    <Modal title="Deactivate this address?" onClose={onClose}>
      <div className="banner amber" style={{ marginBottom: 16 }}>
        <span>⚠️</span>
        <span>
          This cannot be undone. This exact address and its previous connections
          cannot be restored. If you want to use this address again later, you
          will have to register it from scratch.
        </span>
      </div>
      <div className="field">
        <label>Confirm with your account password</label>
        <input
          type="password"
          value={password}
          autoFocus
          onChange={(e) => {
            setPassword(e.target.value)
            setError(false)
          }}
        />
      </div>
      {error && <div className="login-error">Incorrect password.</div>}
      <div className="login-hint" style={{ marginTop: 0, marginBottom: 14 }}>
        Demo account password: <code>{ACCOUNT_PASSWORD}</code>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (password === ACCOUNT_PASSWORD) {
              store.deactivateAddress(address.id)
              onClose()
            } else {
              setError(true)
            }
          }}
        >
          Deactivate permanently
        </button>
      </div>
    </Modal>
  )
}

// ---- Share (Sharings / Requests) ------------------------------------------

function ShareView({
  tab,
  onTab,
  onOpen,
  onApprove,
}: {
  tab: ShareTab
  onTab: (t: ShareTab) => void
  onOpen: (id: string) => void
  onApprove: (id: string) => void
}) {
  const store = useStore()
  const pending = store.requests.filter((r) => r.status === 'pending')

  return (
    <>
      <div className="page-head">
        <h1>Share</h1>
        <p>Your active sharing and requests from organizations.</p>
      </div>

      <div className="seg-toggle" style={{ marginBottom: 20 }}>
        <button className={tab === 'sharings' ? 'on' : ''} onClick={() => onTab('sharings')}>
          Sharings
        </button>
        <button className={tab === 'requests' ? 'on' : ''} onClick={() => onTab('requests')}>
          Requests
          {pending.length > 0 && <span className="pill-count">{pending.length}</span>}
        </button>
      </div>

      {tab === 'sharings' ? (
        <SharingsList onOpen={onOpen} />
      ) : (
        <RequestsList onApprove={onApprove} />
      )}
    </>
  )
}

function SharingsList({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const groups = useMemo(() => {
    const map = new Map<string, Access[]>()
    for (const acc of store.accesses) {
      if (acc.status !== 'active') continue
      const key = acc.physicalAddressId ?? acc.mailingAddressId ?? 'unknown'
      const list = map.get(key) ?? []
      list.push(acc)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [store.accesses])

  if (groups.length === 0)
    return <div className="empty">You are not sharing any address right now.</div>

  return (
    <>
      {groups.map(([addrId, list]) => {
        const addr = store.addressById(addrId)
        return (
          <div key={addrId}>
            <div className="section-title">{addrText(addr)}</div>
            <div className="grid">
              {list.map((acc) => (
                <div className="card clickable" key={acc.id} onClick={() => onOpen(acc.id)}>
                  <div className="row between">
                    <div className="stack">
                      <strong>{acc.orgName}</strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {typeLabel(acc.requestType)} · since {formatDate(acc.createdAt)}
                      </span>
                    </div>
                    <SharingBadge />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

function RequestsList({ onApprove }: { onApprove: (id: string) => void }) {
  const store = useStore()
  const pending = store.requests.filter((r) => r.status === 'pending')
  if (pending.length === 0)
    return <div className="empty">No requests from organizations.</div>
  return (
    <div className="grid">
      {pending.map((r) => (
        <div className="card" key={r.id}>
          <div className="row between">
            <div className="stack" style={{ gap: 2 }}>
              <strong>{r.orgName}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                Requests <strong>{typeLabel(r.requestType)}</strong> ·{' '}
                {formatDate(r.sentAt)}
              </span>
            </div>
            <span className="badge amber">Pending</span>
          </div>
          <p className="muted" style={{ fontSize: 12.5, margin: '10px 0' }}>
            This sharing is permanent and the organization always sees its current
            status.
          </p>
          <div className="row">
            <button className="btn success sm" onClick={() => onApprove(r.id)}>
              Approve
            </button>
            <button className="btn danger sm" onClick={() => store.rejectRequest(r.id)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Access detail ---------------------------------------------------------

function AccessDetail({ access, onBack }: { access: Access; onBack: () => void }) {
  const store = useStore()
  const physical = store.addressById(access.physicalAddressId)
  const mailing = store.addressById(access.mailingAddressId)
  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Back to Share
      </button>
      <div className="card">
        <div className="row between">
          <h2 style={{ fontSize: 20 }}>{access.orgName}</h2>
          <AccessStatusBadge status={access.status} />
        </div>
        <div className="divider" />
        <div className="kv">
          <span className="k">Shared type</span>
          <span className="v">{typeLabel(access.requestType)}</span>
          {physical && (
            <>
              <span className="k">Physical address</span>
              <span className="v">{addrText(physical)}</span>
            </>
          )}
          {mailing && (
            <>
              <span className="k">Mailing address</span>
              <span className="v">{addrText(mailing)}</span>
            </>
          )}
          <span className="k">Sharing since</span>
          <span className="v">{formatDate(access.createdAt)}</span>
        </div>
      </div>
      <div className="section-title">Activity history</div>
      <div className="card">
        <Timeline items={access.history} />
      </div>
    </>
  )
}

// ---- Add address modal -----------------------------------------------------

function AddAddressModal({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [line, setLine] = useState('')
  const [unit, setUnit] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const valid = line && city && state && zip

  return (
    <Modal
      title="Add address"
      subtitle="Your address will be submitted for review."
      onClose={onClose}
    >
      <div className="field">
        <label>Street</label>
        <input value={line} onChange={(e) => setLine(e.target.value)} />
      </div>
      <div className="field">
        <label>Unit</label>
        <input value={unit} onChange={(e) => setUnit(e.target.value)} />
      </div>
      <div className="form-grid">
        <div className="field">
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label>State</label>
          <input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
        </div>
        <div className="field">
          <label>ZIP</label>
          <input value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() => {
            store.addAddress({ line, unit: unit || undefined, city, state, zip })
            onClose()
          }}
        >
          Submit for review
        </button>
      </div>
    </Modal>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className={`checkbox ${checked ? 'on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="box">{checked ? '✓' : ''}</span>
      {label}
    </label>
  )
}

// ---- Approve request modal -------------------------------------------------

function ApproveModal({
  requestId,
  onClose,
  onDone,
}: {
  requestId: string
  onClose: () => void
  onDone: () => void
}) {
  const store = useStore()
  const req = store.requests.find((r) => r.id === requestId)
  const physOptions = activeOfType(store.addresses, 'physical')
  const mailOptions = activeOfType(store.addresses, 'mailing')
  const [phys, setPhys] = useState(physOptions[0]?.id ?? '')
  const [mail, setMail] = useState(mailOptions[0]?.id ?? '')
  if (!req) return null
  const needPhys = req.requestType !== 'mailing'
  const needMail = req.requestType !== 'physical'
  const valid = (!needPhys || phys) && (!needMail || mail)

  return (
    <Modal
      title="Approve request"
      subtitle={`${req.orgName} requests ${typeLabel(req.requestType)}. Pick an active address.`}
      onClose={onClose}
    >
      {needPhys && (
        <div className="field">
          <label>Physical address (active only)</label>
          <select value={phys} onChange={(e) => setPhys(e.target.value)}>
            {physOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {addrText(a)} — {a.city}, {a.state}
              </option>
            ))}
          </select>
        </div>
      )}
      {needMail && (
        <div className="field">
          <label>Mailing address (active only)</label>
          <select value={mail} onChange={(e) => setMail(e.target.value)}>
            {mailOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {addrText(a)} — {a.city}, {a.state}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn success"
          disabled={!valid}
          onClick={() => {
            store.approveRequest(requestId, {
              physicalAddressId: needPhys ? phys : undefined,
              mailingAddressId: needMail ? mail : undefined,
            })
            onDone()
          }}
        >
          Approve
        </button>
      </div>
    </Modal>
  )
}

// ---- My Account ------------------------------------------------------------

function AccountView() {
  return (
    <>
      <div className="page-head">
        <h1>My Account</h1>
        <p>Your profile details.</p>
      </div>
      <div className="card">
        <div className="kv">
          <span className="k">User ID</span>
          <span className="v">{USER_ID}</span>
          <span className="k">First name</span>
          <span className="v">{USER_FIRST}</span>
          <span className="k">Last name</span>
          <span className="v">{USER_LAST}</span>
          <span className="k">Email</span>
          <span className="v">{USER_EMAIL}</span>
          <span className="k">Phone number</span>
          <span className="v">{USER_PHONE}</span>
        </div>
        <div className="divider" />
        <button className="btn ghost sm">Settings</button>
      </div>
    </>
  )
}
