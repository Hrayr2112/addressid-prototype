import { useMemo, useState } from 'react'
import { USER_NAME, useStore } from './store'
import type { Access, Address, AddressType } from './types'
import {
  AccessStatusBadge,
  AddressStatusBadge,
  AddressTypeBadge,
  Modal,
  Timeline,
  formatDate,
  typeLabel,
} from './ui'

type View = 'addresses' | 'accesses' | 'notifications'

export function UserApp({ onSignOut }: { onSignOut: () => void }) {
  const store = useStore()
  const [view, setView] = useState<View>('addresses')
  const [openAddress, setOpenAddress] = useState<string | null>(null)
  const [openAccess, setOpenAccess] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [approveReq, setApproveReq] = useState<string | null>(null)

  const unreadNotes = store.notifications.filter((n) => !n.read).length
  const activeAccessCount = store.accesses.filter((a) => !a.closed).length

  function go(v: View) {
    setView(v)
    setOpenAddress(null)
    setOpenAccess(null)
  }

  const detailAddress = store.addressById(openAddress ?? undefined)
  const detailAccess = store.accesses.find((a) => a.id === openAccess)
  const screenKey = openAddress
    ? `addr-${openAddress}`
    : openAccess
      ? `acc-${openAccess}`
      : view

  return (
    <div className="shell">
      <aside className="sidebar slide-in">
        <div className="sidebar-brand">
          <img src="./pin.svg" alt="" />
          <div>
            <div className="name">AddressID</div>
            <div className="role">{USER_NAME}</div>
          </div>
        </div>
        <NavItem
          icon="🏠"
          label="My Addresses"
          active={view === 'addresses' && !openAddress && !openAccess}
          onClick={() => go('addresses')}
        />
        <NavItem
          icon="🔗"
          label="Accesses"
          active={view === 'accesses'}
          count={activeAccessCount}
          countTone="neutral"
          onClick={() => go('accesses')}
        />
        <NavItem
          icon="🔔"
          label="Notifications"
          active={view === 'notifications'}
          count={unreadNotes || undefined}
          onClick={() => go('notifications')}
        />
        <div className="sidebar-foot">
          <NavItem icon="↩︎" label="Sign out" onClick={onSignOut} />
        </div>
      </aside>

      <main className="main">
        <div className="screen" key={screenKey}>
          {detailAddress ? (
            <AddressDetail
              address={detailAddress}
              onBack={() => setOpenAddress(null)}
              onOpenAccess={(id) => {
                setOpenAddress(null)
                setView('accesses')
                setOpenAccess(id)
              }}
            />
          ) : detailAccess ? (
            <AccessDetail
              access={detailAccess}
              onBack={() => setOpenAccess(null)}
            />
          ) : view === 'addresses' ? (
            <AddressesView
              onAdd={() => setShowAddForm(true)}
              onOpen={(id) => setOpenAddress(id)}
            />
          ) : view === 'accesses' ? (
            <AccessesView onOpen={(id) => setOpenAccess(id)} />
          ) : (
            <NotificationsView onApprove={(id) => setApproveReq(id)} />
          )}
        </div>
      </main>

      {showAddForm && <AddAddressModal onClose={() => setShowAddForm(false)} />}
      {approveReq && (
        <ApproveModal
          requestId={approveReq}
          onClose={() => setApproveReq(null)}
          onDone={() => {
            setApproveReq(null)
            setView('accesses')
          }}
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

// ---- Addresses (home) ------------------------------------------------------

function AddressesView({
  onAdd,
  onOpen,
}: {
  onAdd: () => void
  onOpen: (id: string) => void
}) {
  const store = useStore()
  const [showInactive, setShowInactive] = useState(false)

  const active = store.addresses.filter((a) => a.status === 'active')
  const pending = store.addresses.filter((a) => a.status === 'pending')
  const inactive = store.addresses.filter((a) => a.status === 'inactive')

  return (
    <>
      <div className="page-head row between">
        <div>
          <h1>My Addresses</h1>
          <p>Manage your addresses and who has access to them.</p>
        </div>
        <button className="btn primary" onClick={onAdd}>
          + Add address
        </button>
      </div>

      <div className="section-title">Active addresses</div>
      <div className="grid cols-2">
        {active.map((a) => (
          <AddressCard key={a.id} address={a} onOpen={onOpen} />
        ))}
      </div>

      <div className="section-title">Pending review</div>
      {pending.length === 0 ? (
        <div className="empty">No addresses are awaiting review.</div>
      ) : (
        <div className="grid cols-2">
          {pending.map((a) => (
            <AddressCard key={a.id} address={a} onOpen={onOpen} />
          ))}
        </div>
      )}

      <div className="section-title row between">
        <span>Inactive addresses</span>
        <button className="link-btn" onClick={() => setShowInactive((v) => !v)}>
          {showInactive ? 'Hide' : `Show (${inactive.length})`}
        </button>
      </div>
      {showInactive &&
        (inactive.length === 0 ? (
          <div className="empty">No inactive addresses.</div>
        ) : (
          <div className="grid cols-2">
            {inactive.map((a) => (
              <AddressCard key={a.id} address={a} onOpen={onOpen} />
            ))}
          </div>
        ))}
    </>
  )
}

function accessesForAddress(accesses: Access[], addressId: string) {
  return accesses.filter(
    (acc) =>
      acc.physicalAddressId === addressId || acc.mailingAddressId === addressId,
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
  const linked = accessesForAddress(store.accesses, address.id)
  return (
    <div className="card clickable" onClick={() => onOpen(address.id)}>
      <div className="row between">
        <span className="addr-id">{address.id}</span>
        <AddressStatusBadge status={address.status} />
      </div>
      <div className="addr-line">{address.line}</div>
      <div className="addr-sub">
        {address.city}, {address.state} {address.zip}
      </div>
      <div className="divider" />
      <div className="row between">
        <AddressTypeBadge type={address.type} />
        <span className="muted" style={{ fontSize: 13 }}>
          {linked.length} access{linked.length === 1 ? '' : 'es'}
        </span>
      </div>
      {linked.length > 0 && (
        <div className="stack" style={{ gap: 6, marginTop: 12 }}>
          {linked.map((acc) => (
            <div className="access-mini" key={acc.id}>
              <span style={{ fontWeight: 600 }}>{acc.partnerName}</span>
              <span className="muted">· {typeLabel(acc.requestType)}</span>
              <span style={{ marginLeft: 'auto' }}>
                <AccessStatusBadge status={acc.status} />
              </span>
            </div>
          ))}
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
  const linked = accessesForAddress(store.accesses, address.id)
  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Back to addresses
      </button>
      <div className="card">
        <div className="row between">
          <span className="addr-id">{address.id}</span>
          <AddressStatusBadge status={address.status} />
        </div>
        <div className="addr-line" style={{ fontSize: 20 }}>
          {address.line}
        </div>
        <div className="addr-sub">
          {address.city}, {address.state} {address.zip}
        </div>
        <div className="divider" />
        <div className="kv">
          <span className="k">Address ID</span>
          <span className="v">{address.id}</span>
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
            <button
              className="btn danger sm"
              onClick={() => {
                if (
                  confirm(
                    'Deactivate this address? Linked Accesses will become Inactive and partners will see it in Action Required.',
                  )
                )
                  store.deactivateAddress(address.id)
              }}
            >
              Deactivate
            </button>
          </>
        )}
      </div>

      <div className="section-title">Accesses for this address</div>
      {linked.length === 0 ? (
        <div className="empty">No accesses are linked to this address yet.</div>
      ) : (
        <div className="grid">
          {linked.map((acc) => (
            <div
              className="card clickable"
              key={acc.id}
              onClick={() => onOpenAccess(acc.id)}
            >
              <div className="row between">
                <div className="stack">
                  <strong>{acc.partnerName}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {typeLabel(acc.requestType)} · since {formatDate(acc.createdAt)}
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

// ---- Accesses --------------------------------------------------------------

function AccessesView({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  // group accesses by their primary (physical, else mailing) address
  const groups = useMemo(() => {
    const map = new Map<string, Access[]>()
    for (const acc of store.accesses) {
      const key = acc.physicalAddressId ?? acc.mailingAddressId ?? 'unknown'
      const list = map.get(key) ?? []
      list.push(acc)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [store.accesses])

  return (
    <>
      <div className="page-head">
        <h1>Accesses</h1>
        <p>Every partner connection, grouped by address.</p>
      </div>
      {groups.map(([addrId, list]) => {
        const addr = store.addressById(addrId)
        return (
          <div key={addrId}>
            <div className="section-title">
              {addr ? `${addr.id} · ${addr.line}` : addrId}
            </div>
            <div className="grid">
              {list.map((acc) => (
                <div
                  className="card clickable"
                  key={acc.id}
                  onClick={() => onOpen(acc.id)}
                >
                  <div className="row between">
                    <div className="stack">
                      <strong>{acc.partnerName}</strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {typeLabel(acc.requestType)} · created{' '}
                        {formatDate(acc.createdAt)}
                      </span>
                    </div>
                    <AccessStatusBadge status={acc.status} />
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

// ---- Access detail ---------------------------------------------------------

function AccessDetail({
  access,
  onBack,
}: {
  access: Access
  onBack: () => void
}) {
  const store = useStore()
  const [changing, setChanging] = useState(false)
  const physical = store.addressById(access.physicalAddressId)
  const mailing = store.addressById(access.mailingAddressId)

  return (
    <>
      <button className="back-link" onClick={onBack}>
        ← Back to Accesses
      </button>
      <div className="card">
        <div className="row between">
          <div className="stack">
            <h2 style={{ fontSize: 20 }}>{access.partnerName}</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {access.id}
            </span>
          </div>
          <AccessStatusBadge status={access.status} />
        </div>
        <div className="divider" />
        <div className="kv">
          <span className="k">Shared type</span>
          <span className="v">{typeLabel(access.requestType)}</span>
          {physical && (
            <>
              <span className="k">Physical address</span>
              <span className="v">
                {physical.id} · {physical.line}
              </span>
            </>
          )}
          {mailing && (
            <>
              <span className="k">Mailing address</span>
              <span className="v">
                {mailing.id} · {mailing.line}
              </span>
            </>
          )}
          <span className="k">Created</span>
          <span className="v">{formatDate(access.createdAt)}</span>
        </div>
        {!access.closed && (
          <>
            <div className="divider" />
            <button className="btn ghost sm" onClick={() => setChanging(true)}>
              Change address
            </button>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              Switch to another active address and the partner sees the update
              automatically.
            </p>
          </>
        )}
      </div>

      <div className="section-title">Activity history</div>
      <div className="card">
        <Timeline items={access.history} />
      </div>

      {changing && (
        <ChangeAddressModal access={access} onClose={() => setChanging(false)} />
      )}
    </>
  )
}

// ---- Add address modal -----------------------------------------------------

function AddAddressModal({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [line, setLine] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [type, setType] = useState<AddressType>('both')
  const valid = line && city && state && zip

  return (
    <Modal
      title="Add address"
      subtitle="Your address will be submitted for review."
      onClose={onClose}
    >
      <div className="field">
        <label>Address line</label>
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="Street, number, unit"
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label>State</label>
          <input
            value={state}
            onChange={(e) => setState(e.target.value)}
            maxLength={2}
            placeholder="IL"
          />
        </div>
        <div className="field">
          <label>ZIP</label>
          <input value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Address type</label>
        <div className="seg">
          {(['physical', 'mailing', 'both'] as AddressType[]).map((t) => (
            <button
              key={t}
              className={type === t ? 'on' : ''}
              onClick={() => setType(t)}
            >
              {typeLabel(t)}
            </button>
          ))}
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
            store.addAddress({ line, city, state, zip, type })
            onClose()
          }}
        >
          Submit for review
        </button>
      </div>
    </Modal>
  )
}

// ---- Approve request modal -------------------------------------------------

function activeOfType(addresses: Address[], need: 'physical' | 'mailing') {
  return addresses.filter(
    (a) => a.status === 'active' && (a.type === need || a.type === 'both'),
  )
}

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
      title="Approve Access request"
      subtitle={`${req.partnerName} is requesting ${typeLabel(req.requestType)}. Pick an active address.`}
      onClose={onClose}
    >
      {needPhys && (
        <div className="field">
          <label>Physical address (active only)</label>
          <select value={phys} onChange={(e) => setPhys(e.target.value)}>
            {physOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} — {a.line}
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
                {a.id} — {a.line}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="banner violet" style={{ marginTop: 4 }}>
        <span>ℹ️</span>
        <span>
          This Access is permanent, and the partner will always see its current
          status.
        </span>
      </div>
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

// ---- Change address modal --------------------------------------------------

function ChangeAddressModal({
  access,
  onClose,
}: {
  access: Access
  onClose: () => void
}) {
  const store = useStore()
  const needPhys = access.requestType !== 'mailing'
  const needMail = access.requestType !== 'physical'
  const physOptions = activeOfType(store.addresses, 'physical')
  const mailOptions = activeOfType(store.addresses, 'mailing')
  const [phys, setPhys] = useState(
    access.physicalAddressId ?? physOptions[0]?.id ?? '',
  )
  const [mail, setMail] = useState(
    access.mailingAddressId ?? mailOptions[0]?.id ?? '',
  )

  return (
    <Modal
      title="Change address"
      subtitle="Pick another active address. The partner will be notified."
      onClose={onClose}
    >
      {needPhys && (
        <div className="field">
          <label>Physical address</label>
          <select value={phys} onChange={(e) => setPhys(e.target.value)}>
            {physOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} — {a.line}
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
                {a.id} — {a.line}
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
          className="btn primary"
          onClick={() => {
            store.changeAccessAddress(access.id, {
              physicalAddressId: needPhys ? phys : undefined,
              mailingAddressId: needMail ? mail : undefined,
            })
            onClose()
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  )
}

// ---- Notifications ---------------------------------------------------------

function NotificationsView({
  onApprove,
}: {
  onApprove: (requestId: string) => void
}) {
  const store = useStore()

  return (
    <>
      <div className="page-head row between">
        <div>
          <h1>Notifications</h1>
          <p>Access requests and changes to your Accesses.</p>
        </div>
        {store.notifications.some((n) => !n.read) && (
          <button className="link-btn" onClick={store.markAllNotificationsRead}>
            Mark all as read
          </button>
        )}
      </div>
      <div className="grid">
        {store.notifications.length === 0 && (
          <div className="empty">No notifications.</div>
        )}
        {store.notifications.map((n) => {
          const req = n.requestId
            ? store.requests.find((r) => r.id === n.requestId)
            : undefined
          const pending = req?.status === 'pending'
          return (
            <div
              key={n.id}
              className={`notif ${n.read ? '' : 'unread'}`}
              onClick={() => store.markNotificationRead(n.id)}
            >
              {!n.read && <div className="unread-dot" />}
              <div style={{ flex: 1 }}>
                <div className="row between">
                  <strong>{n.title}</strong>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {formatDate(n.date)}
                  </span>
                </div>
                <div className="addr-sub" style={{ marginTop: 4 }}>
                  {n.body}
                </div>
                {pending && req && (
                  <>
                    <div
                      className="banner violet"
                      style={{
                        marginTop: 12,
                        marginBottom: 12,
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <span>
                        Requested: <strong>{typeLabel(req.requestType)}</strong>
                      </span>
                      <span style={{ fontSize: 13 }}>
                        This Access is permanent. The partner will always see its
                        current status.
                      </span>
                    </div>
                    <div className="row">
                      <button
                        className="btn success sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onApprove(req.id)
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className="btn danger sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          store.rejectRequest(req.id)
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </>
                )}
                {req && req.status === 'rejected' && (
                  <div className="tag" style={{ marginTop: 10 }}>
                    Declined
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
