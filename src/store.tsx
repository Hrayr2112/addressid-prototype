import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  Access,
  AccessRequest,
  Address,
  AddressType,
  OrgChange,
  PreviousSharing,
  UserNotification,
} from './types'

export const BRAND_NAME = 'DeMo'

// ---- The user this prototype is signed in as ----
export const USER_ID = 'USR-2048'
export const USER_FIRST = 'Emily'
export const USER_LAST = 'Carter'
export const USER_NAME = `${USER_FIRST} ${USER_LAST}`
export const USER_EMAIL = 'emily.carter@example.com'
export const USER_PHONE = '+1 (312) 555-0142'

// ---- The organization this prototype is signed in as (a bank) ----
export const ORG_NAME = 'Northbridge Bank'
export const ORG_CATEGORY = 'Bank'
export const ORG_AGENT = 'Marcus Reed'
export const ORG_AGENT_EMAIL = 'm.reed@northbridge.example'

// Password required to confirm sensitive actions (e.g. deactivating an address).
export const ACCOUNT_PASSWORD = 'demo'

const REVIEW_DELAY_MS = 3500

let counter = 100
const uid = (prefix: string) => `${prefix}-${++counter}`
const labelOf = (t: AddressType) =>
  t === 'both' ? 'Physical + Mailing' : t === 'physical' ? 'Physical' : 'Mailing'
const now = () => new Date().toISOString()
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()

// ---- Seed data -------------------------------------------------------------

const seedAddresses: Address[] = [
  { id: 'ADR-4821', line: '12 Baker Street', unit: 'Apt 4', city: 'Springfield', state: 'IL', zip: '62704', type: 'both', status: 'active' },
  { id: 'ADR-7390', line: 'PO Box 1180', city: 'Chicago', state: 'IL', zip: '60601', type: 'mailing', status: 'active' },
  { id: 'ADR-2255', line: '55 Oak Avenue', city: 'Madison', state: 'WI', zip: '53703', type: 'both', status: 'active' },
  { id: 'ADR-9001', line: '8 Riverside Drive', city: 'Austin', state: 'TX', zip: '73301', type: 'both', status: 'pending' },
  { id: 'ADR-3110', line: '200 Elm Court', city: 'Peoria', state: 'IL', zip: '61602', type: 'both', status: 'inactive' },
]

const seedAccesses: Access[] = [
  {
    id: 'ACC-501',
    orgName: ORG_NAME,
    personName: USER_NAME,
    orgInternalUserId: 'NB-7741',
    requestType: 'physical',
    physicalAddressId: 'ADR-4821',
    status: 'active',
    createdAt: daysAgo(40),
    history: [
      { id: uid('H'), date: daysAgo(41), type: 'Request sent' },
      { id: uid('H'), date: daysAgo(40), type: 'Approved' },
      { id: uid('H'), date: daysAgo(40), type: 'Status changed', status: 'Active' },
    ],
  },
  {
    id: 'ACC-502',
    orgName: 'Evergreen Insurance',
    personName: USER_NAME,
    orgInternalUserId: 'EI-0099',
    requestType: 'mailing',
    mailingAddressId: 'ADR-7390',
    status: 'active',
    createdAt: daysAgo(22),
    history: [
      { id: uid('H'), date: daysAgo(23), type: 'Request sent' },
      { id: uid('H'), date: daysAgo(22), type: 'Approved' },
      { id: uid('H'), date: daysAgo(22), type: 'Status changed', status: 'Active' },
    ],
  },
  {
    id: 'ACC-503',
    orgName: ORG_NAME,
    personName: USER_NAME,
    orgInternalUserId: 'NB-3380',
    requestType: 'physical',
    physicalAddressId: 'ADR-3110', // deactivated address
    status: 'inactive',
    createdAt: daysAgo(120),
    history: [
      { id: uid('H'), date: daysAgo(121), type: 'Request sent' },
      { id: uid('H'), date: daysAgo(120), type: 'Approved' },
      { id: uid('H'), date: daysAgo(120), type: 'Status changed', status: 'Active' },
      { id: uid('H'), date: daysAgo(6), type: 'Status changed', status: 'Inactive' },
    ],
  },
]

const seedRequests: AccessRequest[] = [
  {
    id: 'REQ-301',
    orgName: 'Coastal Trust Bank',
    firstName: USER_FIRST,
    lastName: USER_LAST,
    userId: USER_ID,
    requestType: 'both',
    status: 'pending',
    sentAt: daysAgo(1),
  },
]

const seedNotifications: UserNotification[] = [
  {
    id: uid('N'),
    kind: 'request',
    title: 'New request',
    body: 'Coastal Trust Bank requests Physical + Mailing.',
    orgName: 'Coastal Trust Bank',
    requestId: 'REQ-301',
    date: daysAgo(1),
    read: false,
  },
  {
    id: uid('N'),
    kind: 'event',
    title: 'Address deactivated',
    body: 'You deactivated 200 Elm Court.',
    date: daysAgo(6),
    read: false,
  },
  {
    id: uid('N'),
    kind: 'event',
    title: 'Sharing started',
    body: 'You started sharing with Northbridge Bank.',
    orgName: 'Northbridge Bank',
    date: daysAgo(40),
    read: true,
  },
]

const seedPreviousSharings: PreviousSharing[] = [
  {
    id: uid('P'),
    addressId: 'ADR-4821',
    orgName: 'Evergreen Insurance',
    requestType: 'physical',
    date: daysAgo(30),
    reason: 'stopped',
  },
]

// ---- Synthetic organization client roster ---------------------------------

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph',
  'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy',
  'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Andrew', 'Donna', 'Joshua', 'Carol',
  'Kenneth', 'Michelle', 'Kevin', 'Amanda', 'Brian', 'Melissa', 'George', 'Deborah',
]
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
]
const STREETS = ['Maple Ave', 'Oak St', 'Pine Rd', 'Cedar Ln', 'Elm St', 'Park Blvd', 'Lake Dr', 'Hill St', 'River Rd', 'Sunset Blvd', 'Main St', 'Washington Ave']
const PLACES = [
  ['Denver', 'CO'], ['Seattle', 'WA'], ['Austin', 'TX'], ['Boston', 'MA'],
  ['Portland', 'OR'], ['Miami', 'FL'], ['Phoenix', 'AZ'], ['Atlanta', 'GA'],
  ['Chicago', 'IL'], ['Dallas', 'TX'], ['Columbus', 'OH'], ['Nashville', 'TN'],
]

let clientSeq = 0
function makeClient(
  status: Access['status'],
  opts: { snoozed?: boolean } = {},
): Access {
  const n = clientSeq++
  const first = FIRST_NAMES[n % FIRST_NAMES.length]
  const last = LAST_NAMES[(n * 5) % LAST_NAMES.length]
  const [city, st] = PLACES[n % PLACES.length]
  const rt = (['physical', 'mailing', 'both'] as AddressType[])[n % 3]
  const addressLabel = `${120 + n * 4} ${STREETS[n % STREETS.length]}, ${city}, ${st}`
  const history: Access['history'] = [
    { id: uid('H'), date: daysAgo(60 + n), type: 'Request sent' },
    { id: uid('H'), date: daysAgo(58 + n), type: 'Approved' },
    { id: uid('H'), date: daysAgo(58 + n), type: 'Status changed', status: 'Active' },
  ]
  if (status === 'inactive')
    history.push({ id: uid('H'), date: daysAgo(3 + (n % 9)), type: 'Status changed', status: 'Inactive' })
  if (status === 'closed') {
    history.push({ id: uid('H'), date: daysAgo(20 + (n % 10)), type: 'Status changed', status: 'Inactive' })
    history.push({ id: uid('H'), date: daysAgo(10 + (n % 8)), type: 'Access closed' })
  }
  return {
    id: `ACC-${700 + n}`,
    orgName: ORG_NAME,
    personName: `${first} ${last}`,
    orgInternalUserId: `NB-${1000 + n}`,
    requestType: rt,
    addressLabel,
    status,
    createdAt: daysAgo(58 + n),
    history,
    snoozedUntil: opts.snoozed ? daysFromNow(4 + (n % 6)) : undefined,
  }
}

const activeClients = Array.from({ length: 25 }, () => makeClient('active'))
const newActionClients = Array.from({ length: 10 }, () => makeClient('inactive'))
const snoozedClients = Array.from({ length: 3 }, () => makeClient('inactive', { snoozed: true }))
const closedClients = Array.from({ length: 6 }, () => makeClient('closed'))

const generatedClients = [
  ...activeClients,
  ...newActionClients,
  ...snoozedClients,
  ...closedClients,
]

// Organization Notifications log — every entry links to a client or a section.
const seedChanges: OrgChange[] = [
  { id: uid('C'), text: `Status changed to Inactive — ${newActionClients[0].personName}`, date: daysAgo(1), read: false, accessId: newActionClients[0].id, section: 'action_required' },
  { id: uid('C'), text: `Status changed to Inactive — ${newActionClients[1].personName}`, date: daysAgo(2), read: false, accessId: newActionClients[1].id, section: 'action_required' },
  { id: uid('C'), text: `New access approved — ${activeClients[0].personName}`, date: daysAgo(3), read: false, accessId: activeClients[0].id },
  { id: uid('C'), text: 'Status changed to Inactive — NB-3380', date: daysAgo(6), read: true, accessId: 'ACC-503', section: 'action_required' },
  { id: uid('C'), text: `Address updated — ${activeClients[1].personName}`, date: daysAgo(8), read: true, accessId: activeClients[1].id },
  { id: uid('C'), text: `Access closed — ${closedClients[0].personName}`, date: daysAgo(10), read: true, accessId: closedClients[0].id },
  { id: uid('C'), text: 'New access approved — NB-7741', date: daysAgo(40), read: true, accessId: 'ACC-501' },
]

// ---- Store -----------------------------------------------------------------

interface Store {
  addresses: Address[]
  accesses: Access[]
  requests: AccessRequest[]
  notifications: UserNotification[]
  previousSharings: PreviousSharing[]
  changes: OrgChange[]
  // user actions
  addAddress: (a: {
    line: string
    unit?: string
    city: string
    state: string
    zip: string
  }) => string
  approveRequest: (
    requestId: string,
    pick: { physicalAddressId?: string; mailingAddressId?: string },
  ) => void
  rejectRequest: (requestId: string) => void
  stopSharing: (accessId: string) => void
  changeSharingAddress: (
    accessId: string,
    pick: { physicalAddressId?: string; mailingAddressId?: string },
  ) => void
  deactivateAddress: (addressId: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  // organization actions
  sendRequest: (r: {
    userId: string
    firstName: string
    lastName: string
    requestType: AddressType
  }) => void
  snoozeAccess: (accessId: string, untilIso: string) => void
  unsnoozeAccess: (accessId: string) => void
  closeAccess: (accessId: string) => void
  markChangeRead: (id: string) => void
  markAllChangesRead: () => void
  // lookups
  addressById: (id?: string) => Address | undefined
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>(seedAddresses)
  const [accesses, setAccesses] = useState<Access[]>([
    ...seedAccesses,
    ...generatedClients,
  ])
  const [requests, setRequests] = useState<AccessRequest[]>(seedRequests)
  const [notifications, setNotifications] =
    useState<UserNotification[]>(seedNotifications)
  const [previousSharings, setPreviousSharings] =
    useState<PreviousSharing[]>(seedPreviousSharings)
  const [changes, setChanges] = useState<OrgChange[]>(seedChanges)

  const addressById = useCallback(
    (id?: string) => addresses.find((a) => a.id === id),
    [addresses],
  )

  const pushChangeForOrg = useCallback(
    (
      orgName: string,
      text: string,
      opts?: { accessId?: string; section?: OrgChange['section'] },
    ) => {
      if (orgName !== ORG_NAME) return
      setChanges((prev) => [
        {
          id: uid('C'),
          text,
          date: now(),
          read: false,
          accessId: opts?.accessId,
          section: opts?.section,
        },
        ...prev,
      ])
    },
    [],
  )

  const notify = useCallback(
    (
      title: string,
      body: string,
      extra?: { kind?: UserNotification['kind']; orgName?: string; requestId?: string },
    ) => {
      setNotifications((prev) => [
        {
          id: uid('N'),
          kind: extra?.kind ?? 'event',
          title,
          body,
          orgName: extra?.orgName,
          requestId: extra?.requestId,
          date: now(),
          read: false,
        },
        ...prev,
      ])
    },
    [],
  )

  const addAddress: Store['addAddress'] = useCallback(
    (a) => {
      const id = uid('ADR')
      // The capability is determined automatically: a PO Box is mailing-only,
      // any street address is usable as both physical and mailing.
      const type: AddressType = /po\s*box/i.test(a.line) ? 'mailing' : 'both'
      setAddresses((prev) => [...prev, { ...a, id, type, status: 'pending' }])
      // Simulate a review step, then auto-approve to Active.
      setTimeout(() => {
        setAddresses((prev) =>
          prev.map((x) => (x.id === id ? { ...x, status: 'active' } : x)),
        )
        notify(
          'Address approved',
          `Your new address passed review and is now active.`,
        )
      }, REVIEW_DELAY_MS)
      return id
    },
    [notify],
  )

  const approveRequest: Store['approveRequest'] = useCallback(
    (requestId, pick) => {
      let snapshot: AccessRequest | undefined
      setRequests((prev) => {
        snapshot = prev.find((r) => r.id === requestId)
        return prev.filter((r) => r.id !== requestId)
      })
      if (!snapshot) return
      const req = snapshot
      const newAccess: Access = {
        id: uid('ACC'),
        orgName: req.orgName,
        personName: `${req.firstName} ${req.lastName}`,
        orgInternalUserId: uid('USR'),
        requestType: req.requestType,
        physicalAddressId:
          req.requestType !== 'mailing' ? pick.physicalAddressId : undefined,
        mailingAddressId:
          req.requestType !== 'physical' ? pick.mailingAddressId : undefined,
        status: 'active',
        createdAt: now(),
        history: [
          { id: uid('H'), date: req.sentAt, type: 'Request sent' },
          { id: uid('H'), date: now(), type: 'Approved' },
          { id: uid('H'), date: now(), type: 'Status changed', status: 'Active' },
        ],
      }
      setAccesses((prev) => [newAccess, ...prev])
      notify('Request approved', `${req.orgName} · ${labelOf(req.requestType)}`, {
        orgName: req.orgName,
      })
      pushChangeForOrg(
        req.orgName,
        `New access approved — ${newAccess.personName}`,
        { accessId: newAccess.id },
      )
    },
    [notify, pushChangeForOrg],
  )

  const rejectRequest: Store['rejectRequest'] = useCallback(
    (requestId) => {
      let orgName = ''
      let requestType: AddressType = 'both'
      setRequests((prev) => {
        const r = prev.find((x) => x.id === requestId)
        if (r) {
          orgName = r.orgName
          requestType = r.requestType
        }
        return prev.filter((x) => x.id !== requestId)
      })
      notify('Request declined', `${orgName} · ${labelOf(requestType)}`, { orgName })
    },
    [notify],
  )

  const stopSharing: Store['stopSharing'] = useCallback(
    (accessId) => {
      setAccesses((prev) =>
        prev.map((acc) => {
          if (acc.id !== accessId) return acc
          const entries: PreviousSharing[] = []
          for (const addressId of [acc.physicalAddressId, acc.mailingAddressId]) {
            if (addressId)
              entries.push({
                id: uid('P'),
                addressId,
                orgName: acc.orgName,
                requestType: acc.requestType,
                date: now(),
                reason: 'stopped',
              })
          }
          setPreviousSharings((p) => [...entries, ...p])
          pushChangeForOrg(acc.orgName, `Sharing stopped — ${acc.personName}`, { accessId: acc.id })
          return {
            ...acc,
            status: 'stopped',
            history: [
              ...acc.history,
              { id: uid('H'), date: now(), type: 'Sharing stopped' },
            ],
          }
        }),
      )
    },
    [pushChangeForOrg],
  )

  const changeSharingAddress: Store['changeSharingAddress'] = useCallback(
    (accessId, pick) => {
      setAccesses((prev) =>
        prev.map((acc) => {
          if (acc.id !== accessId) return acc
          const entries: PreviousSharing[] = []
          const newPhys =
            acc.requestType !== 'mailing'
              ? pick.physicalAddressId ?? acc.physicalAddressId
              : acc.physicalAddressId
          const newMail =
            acc.requestType !== 'physical'
              ? pick.mailingAddressId ?? acc.mailingAddressId
              : acc.mailingAddressId
          if (
            acc.physicalAddressId &&
            newPhys &&
            newPhys !== acc.physicalAddressId
          )
            entries.push({ id: uid('P'), addressId: acc.physicalAddressId, orgName: acc.orgName, requestType: acc.requestType, date: now(), reason: 'changed' })
          if (
            acc.mailingAddressId &&
            newMail &&
            newMail !== acc.mailingAddressId
          )
            entries.push({ id: uid('P'), addressId: acc.mailingAddressId, orgName: acc.orgName, requestType: acc.requestType, date: now(), reason: 'changed' })
          if (entries.length) setPreviousSharings((p) => [...entries, ...p])
          pushChangeForOrg(acc.orgName, `Address updated — ${acc.personName}`, { accessId: acc.id })
          return {
            ...acc,
            physicalAddressId: newPhys,
            mailingAddressId: newMail,
            status: 'active',
            history: [
              ...acc.history,
              { id: uid('H'), date: now(), type: 'Address updated' },
              { id: uid('H'), date: now(), type: 'Status changed', status: 'Active' },
            ],
          }
        }),
      )
    },
    [pushChangeForOrg],
  )

  const deactivateAddress: Store['deactivateAddress'] = useCallback(
    (addressId) => {
      let line = ''
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id !== addressId) return a
          line = a.line
          return { ...a, status: 'inactive' }
        }),
      )
      notify('Address deactivated', `You deactivated ${line}.`)
      setAccesses((prev) =>
        prev.map((acc) => {
          const affected =
            acc.physicalAddressId === addressId ||
            acc.mailingAddressId === addressId
          if (!affected || acc.status !== 'active') return acc
          setPreviousSharings((p) => [
            { id: uid('P'), addressId, orgName: acc.orgName, requestType: acc.requestType, date: now(), reason: 'deactivated' },
            ...p,
          ])
          pushChangeForOrg(
            acc.orgName,
            `Status changed to Inactive — ${acc.personName}`,
            { accessId: acc.id, section: 'action_required' },
          )
          return {
            ...acc,
            status: 'inactive',
            history: [
              ...acc.history,
              { id: uid('H'), date: now(), type: 'Status changed', status: 'Inactive' },
            ],
          }
        }),
      )
    },
    [pushChangeForOrg, notify],
  )

  const markNotificationRead: Store['markNotificationRead'] = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllNotificationsRead: Store['markAllNotificationsRead'] =
    useCallback(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }, [])

  const sendRequest: Store['sendRequest'] = useCallback(
    (r) => {
      const requestId = uid('REQ')
      setRequests((prev) => [
        ...prev,
        {
          id: requestId,
          orgName: ORG_NAME,
          firstName: r.firstName,
          lastName: r.lastName,
          userId: r.userId,
          requestType: r.requestType,
          status: 'pending',
          sentAt: now(),
        },
      ])
      notify('New request', `${ORG_NAME} requests ${labelOf(r.requestType)}.`, {
        kind: 'request',
        orgName: ORG_NAME,
        requestId,
      })
    },
    [notify],
  )

  const snoozeAccess: Store['snoozeAccess'] = useCallback((accessId, untilIso) => {
    setAccesses((prev) =>
      prev.map((acc) =>
        acc.id === accessId ? { ...acc, snoozedUntil: untilIso } : acc,
      ),
    )
  }, [])

  const unsnoozeAccess: Store['unsnoozeAccess'] = useCallback((accessId) => {
    setAccesses((prev) =>
      prev.map((acc) =>
        acc.id === accessId ? { ...acc, snoozedUntil: null } : acc,
      ),
    )
  }, [])

  const closeAccess: Store['closeAccess'] = useCallback(
    (accessId) => {
      let orgName = ''
      let personName = ''
      setAccesses((prev) =>
        prev.map((acc) => {
          if (acc.id !== accessId) return acc
          orgName = acc.orgName
          personName = acc.personName
          return {
            ...acc,
            status: 'closed',
            history: [
              ...acc.history,
              { id: uid('H'), date: now(), type: 'Access closed' },
            ],
          }
        }),
      )
      pushChangeForOrg(orgName, `Access closed — ${personName}`, { accessId })
    },
    [pushChangeForOrg],
  )

  const markChangeRead: Store['markChangeRead'] = useCallback((id) => {
    setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, read: true } : c)))
  }, [])

  const markAllChangesRead: Store['markAllChangesRead'] = useCallback(() => {
    setChanges((prev) => prev.map((c) => ({ ...c, read: true })))
  }, [])

  const value = useMemo<Store>(
    () => ({
      addresses,
      accesses,
      requests,
      notifications,
      previousSharings,
      changes,
      addAddress,
      approveRequest,
      rejectRequest,
      stopSharing,
      changeSharingAddress,
      deactivateAddress,
      markNotificationRead,
      markAllNotificationsRead,
      sendRequest,
      snoozeAccess,
      unsnoozeAccess,
      closeAccess,
      markChangeRead,
      markAllChangesRead,
      addressById,
    }),
    [
      addresses,
      accesses,
      requests,
      notifications,
      previousSharings,
      changes,
      addAddress,
      approveRequest,
      rejectRequest,
      stopSharing,
      changeSharingAddress,
      deactivateAddress,
      markNotificationRead,
      markAllNotificationsRead,
      sendRequest,
      snoozeAccess,
      unsnoozeAccess,
      closeAccess,
      markChangeRead,
      markAllChangesRead,
      addressById,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
