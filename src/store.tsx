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
  PartnerChange,
  UserNotification,
} from './types'

// The single user and the single partner brand the prototype is signed in as.
export const USER_NAME = 'Emily Carter'
export const PARTNER_NAME = 'Northwind Logistics'
export const PARTNER_AGENT = 'Marcus Reed'
export const PARTNER_AGENT_EMAIL = 'm.reed@northwind.example'

// How long a submitted address stays "pending review" before it is
// auto-approved (simulating a back-office review step).
const REVIEW_DELAY_MS = 3500

let counter = 100
const uid = (prefix: string) => `${prefix}-${++counter}`
const now = () => new Date().toISOString()
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
const daysFromNow = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()

// ---- Seed data -------------------------------------------------------------

const seedAddresses: Address[] = [
  {
    id: 'ADR-4821',
    line: '12 Baker Street, Apt 4',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    type: 'both',
    status: 'active',
  },
  {
    id: 'ADR-7390',
    line: 'PO Box 1180',
    city: 'Chicago',
    state: 'IL',
    zip: '60601',
    type: 'mailing',
    status: 'active',
  },
  {
    id: 'ADR-2255',
    line: '55 Oak Avenue',
    city: 'Madison',
    state: 'WI',
    zip: '53703',
    type: 'physical',
    status: 'active',
  },
  {
    id: 'ADR-9001',
    line: '8 Riverside Drive',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
    type: 'both',
    status: 'pending',
  },
  {
    id: 'ADR-3110',
    line: '200 Elm Court',
    city: 'Peoria',
    state: 'IL',
    zip: '61602',
    type: 'physical',
    status: 'inactive',
  },
]

const seedAccesses: Access[] = [
  {
    id: 'ACC-501',
    partnerName: PARTNER_NAME,
    personName: USER_NAME,
    partnerInternalUserId: 'NW-USR-7741',
    requestType: 'physical',
    physicalAddressId: 'ADR-4821',
    status: 'active',
    createdAt: daysAgo(40),
    history: [
      { id: uid('H'), date: daysAgo(41), type: 'Access request sent' },
      { id: uid('H'), date: daysAgo(40), type: 'Access approved' },
      { id: uid('H'), date: daysAgo(40), type: 'Status changed', status: 'Active' },
    ],
  },
  {
    id: 'ACC-502',
    partnerName: 'Globex Retail',
    personName: USER_NAME,
    partnerInternalUserId: 'GX-0099',
    requestType: 'mailing',
    mailingAddressId: 'ADR-7390',
    status: 'active',
    createdAt: daysAgo(22),
    history: [
      { id: uid('H'), date: daysAgo(23), type: 'Access request sent' },
      { id: uid('H'), date: daysAgo(22), type: 'Access approved' },
      { id: uid('H'), date: daysAgo(22), type: 'Status changed', status: 'Active' },
    ],
  },
  {
    id: 'ACC-503',
    partnerName: PARTNER_NAME,
    personName: 'James Sullivan',
    partnerInternalUserId: 'NW-USR-3380',
    requestType: 'physical',
    physicalAddressId: 'ADR-3110', // old, now-inactive address
    status: 'inactive',
    createdAt: daysAgo(120),
    history: [
      { id: uid('H'), date: daysAgo(121), type: 'Access request sent' },
      { id: uid('H'), date: daysAgo(120), type: 'Access approved' },
      { id: uid('H'), date: daysAgo(120), type: 'Status changed', status: 'Active' },
      { id: uid('H'), date: daysAgo(6), type: 'Status changed', status: 'Inactive' },
    ],
  },
]

const seedRequests: AccessRequest[] = [
  {
    id: 'REQ-301',
    partnerName: 'Skyline Bank',
    firstName: 'Emily',
    lastName: 'Carter',
    addressId: 'ADR-4821',
    requestType: 'both',
    status: 'pending',
    sentAt: daysAgo(1),
  },
]

const seedNotifications: UserNotification[] = [
  {
    id: uid('N'),
    kind: 'access_request',
    requestId: 'REQ-301',
    title: 'New Access request',
    body: 'Skyline Bank is requesting access to your address (Physical + Mailing).',
    date: daysAgo(1),
    read: false,
  },
]

const seedChanges: PartnerChange[] = [
  {
    id: uid('C'),
    text: 'Status changed to Inactive — NW-USR-3380',
    date: daysAgo(6),
    read: false,
    link: 'action_required',
  },
  {
    id: uid('C'),
    text: 'New Access approved — NW-USR-7741',
    date: daysAgo(40),
    read: true,
  },
]

// ---- Store -----------------------------------------------------------------

interface Store {
  addresses: Address[]
  accesses: Access[]
  requests: AccessRequest[]
  notifications: UserNotification[]
  changes: PartnerChange[]
  // user actions
  addAddress: (a: Omit<Address, 'id' | 'status'>) => string
  approveRequest: (
    requestId: string,
    pick: { physicalAddressId?: string; mailingAddressId?: string },
  ) => void
  rejectRequest: (requestId: string) => void
  changeAccessAddress: (
    accessId: string,
    pick: { physicalAddressId?: string; mailingAddressId?: string },
  ) => void
  deactivateAddress: (addressId: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  // partner actions
  sendRequest: (r: {
    addressId: string
    firstName: string
    lastName: string
    requestType: AddressType
  }) => void
  snoozeAccess: (accessId: string, days: number) => void
  closeAccess: (accessId: string) => void
  markChangeRead: (id: string) => void
  markAllChangesRead: () => void
  // lookups
  addressById: (id?: string) => Address | undefined
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>(seedAddresses)
  const [accesses, setAccesses] = useState<Access[]>(seedAccesses)
  const [requests, setRequests] = useState<AccessRequest[]>(seedRequests)
  const [notifications, setNotifications] =
    useState<UserNotification[]>(seedNotifications)
  const [changes, setChanges] = useState<PartnerChange[]>(seedChanges)

  const addressById = useCallback(
    (id?: string) => addresses.find((a) => a.id === id),
    [addresses],
  )

  const addAddress: Store['addAddress'] = useCallback((a) => {
    const id = uid('ADR')
    setAddresses((prev) => [...prev, { ...a, id, status: 'pending' }])
    // Simulate a review step: after a short delay the address is approved
    // and becomes active, so it can be used for accesses.
    setTimeout(() => {
      setAddresses((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: 'active' } : x)),
      )
      setNotifications((prev) => [
        {
          id: uid('N'),
          kind: 'access_change',
          title: 'Address approved',
          body: `Your address ${id} passed review and is now Active. Partners can request access to it by its Address ID.`,
          date: now(),
          read: false,
        },
        ...prev,
      ])
    }, REVIEW_DELAY_MS)
    return id
  }, [])

  const pushChangeForPartner = useCallback(
    (partnerName: string, text: string, link?: PartnerChange['link']) => {
      if (partnerName !== PARTNER_NAME) return
      setChanges((prev) => [
        { id: uid('C'), text, date: now(), read: false, link },
        ...prev,
      ])
    },
    [],
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
        partnerName: req.partnerName,
        personName: `${req.firstName} ${req.lastName}`,
        partnerInternalUserId: uid('USR'),
        requestType: req.requestType,
        physicalAddressId:
          req.requestType !== 'mailing' ? pick.physicalAddressId : undefined,
        mailingAddressId:
          req.requestType !== 'physical' ? pick.mailingAddressId : undefined,
        status: 'active',
        createdAt: now(),
        history: [
          { id: uid('H'), date: req.sentAt, type: 'Access request sent' },
          { id: uid('H'), date: now(), type: 'Access approved' },
          { id: uid('H'), date: now(), type: 'Status changed', status: 'Active' },
        ],
      }
      setAccesses((prev) => [newAccess, ...prev])
      setNotifications((prev) => [
        {
          id: uid('N'),
          kind: 'access_change',
          title: 'Access approved',
          body: `You granted access to ${req.partnerName}.`,
          date: now(),
          read: false,
        },
        ...prev,
      ])
      pushChangeForPartner(
        req.partnerName,
        `New Access approved — ${newAccess.partnerInternalUserId}`,
      )
    },
    [pushChangeForPartner],
  )

  const rejectRequest: Store['rejectRequest'] = useCallback((requestId) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)),
    )
    setNotifications((prev) =>
      prev.map((n) =>
        n.requestId === requestId
          ? {
              ...n,
              read: true,
              title: 'Request declined',
              body: 'You declined this Access request.',
            }
          : n,
      ),
    )
  }, [])

  const changeAccessAddress: Store['changeAccessAddress'] = useCallback(
    (accessId, pick) => {
      setAccesses((prev) =>
        prev.map((acc) => {
          if (acc.id !== accessId) return acc
          const history = [
            ...acc.history,
            { id: uid('H'), date: now(), type: 'Address updated' },
            { id: uid('H'), date: now(), type: 'Status changed', status: 'Active' },
          ]
          return {
            ...acc,
            physicalAddressId:
              acc.requestType !== 'mailing'
                ? pick.physicalAddressId ?? acc.physicalAddressId
                : acc.physicalAddressId,
            mailingAddressId:
              acc.requestType !== 'physical'
                ? pick.mailingAddressId ?? acc.mailingAddressId
                : acc.mailingAddressId,
            status: 'active',
            history,
          }
        }),
      )
      const acc = accesses.find((a) => a.id === accessId)
      if (acc)
        pushChangeForPartner(
          acc.partnerName,
          `Address updated — ${acc.partnerInternalUserId}`,
        )
    },
    [accesses, pushChangeForPartner],
  )

  const deactivateAddress: Store['deactivateAddress'] = useCallback(
    (addressId) => {
      setAddresses((prev) =>
        prev.map((a) => (a.id === addressId ? { ...a, status: 'inactive' } : a)),
      )
      setAccesses((prev) =>
        prev.map((acc) => {
          const affected =
            acc.physicalAddressId === addressId ||
            acc.mailingAddressId === addressId
          if (!affected || acc.status === 'inactive') return acc
          pushChangeForPartner(
            acc.partnerName,
            `Status changed to Inactive — ${acc.partnerInternalUserId}`,
            'action_required',
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
    [pushChangeForPartner],
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

  const sendRequest: Store['sendRequest'] = useCallback((r) => {
    const requestId = uid('REQ')
    setRequests((prev) => [
      ...prev,
      {
        id: requestId,
        partnerName: PARTNER_NAME,
        firstName: r.firstName,
        lastName: r.lastName,
        addressId: r.addressId,
        requestType: r.requestType,
        status: 'pending',
        sentAt: now(),
      },
    ])
    const label =
      r.requestType === 'both'
        ? 'Physical + Mailing'
        : r.requestType === 'physical'
          ? 'Physical'
          : 'Mailing'
    setNotifications((prev) => [
      {
        id: uid('N'),
        kind: 'access_request',
        requestId,
        title: 'New Access request',
        body: `${PARTNER_NAME} is requesting access to address ${r.addressId} (${label}).`,
        date: now(),
        read: false,
      },
      ...prev,
    ])
  }, [])

  const snoozeAccess: Store['snoozeAccess'] = useCallback((accessId, days) => {
    setAccesses((prev) =>
      prev.map((acc) =>
        acc.id === accessId ? { ...acc, snoozedUntil: daysFromNow(days) } : acc,
      ),
    )
  }, [])

  const closeAccess: Store['closeAccess'] = useCallback(
    (accessId) => {
      let partnerName = ''
      setAccesses((prev) =>
        prev.map((acc) => {
          if (acc.id !== accessId) return acc
          partnerName = acc.partnerName
          return {
            ...acc,
            closed: true,
            status: 'inactive',
            history: [
              ...acc.history,
              { id: uid('H'), date: now(), type: 'Access closed' },
            ],
          }
        }),
      )
      pushChangeForPartner(partnerName, 'Access closed')
    },
    [pushChangeForPartner],
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
      changes,
      addAddress,
      approveRequest,
      rejectRequest,
      changeAccessAddress,
      deactivateAddress,
      markNotificationRead,
      markAllNotificationsRead,
      sendRequest,
      snoozeAccess,
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
      changes,
      addAddress,
      approveRequest,
      rejectRequest,
      changeAccessAddress,
      deactivateAddress,
      markNotificationRead,
      markAllNotificationsRead,
      sendRequest,
      snoozeAccess,
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
