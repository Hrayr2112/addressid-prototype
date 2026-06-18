// Domain types for the clickable prototype.
// Everything lives in memory — no backend, no persistence.

export type AddressType = 'physical' | 'mailing' | 'both'

export type AddressStatus = 'active' | 'pending' | 'inactive'

export interface Address {
  id: string // Address ID, e.g. "ADR-4821"
  line: string
  city: string
  state: string
  zip: string
  type: AddressType
  status: AddressStatus
}

export type AccessStatus = 'active' | 'inactive'

export interface HistoryEvent {
  id: string
  date: string // ISO date
  type: string // e.g. "Access approved"
  status?: string // e.g. "Active"
}

// An approved connection between a partner and the user, for one address.
export interface Access {
  id: string // user-facing access id
  partnerName: string
  personName: string // the user's name, as the partner sees it
  partnerInternalUserId: string // "our internal user id" shown to the partner
  requestType: AddressType // what was requested
  // Approved address(es). For "both" the same or two different addresses.
  physicalAddressId?: string
  mailingAddressId?: string
  status: AccessStatus
  createdAt: string
  history: HistoryEvent[]
  snoozedUntil?: string | null
  closed?: boolean
}

// A request created by the partner, waiting for the user to approve/reject.
export interface AccessRequest {
  id: string
  partnerName: string
  firstName: string
  lastName: string
  addressId: string
  requestType: AddressType
  status: 'pending' | 'approved' | 'rejected'
  sentAt: string
}

export interface UserNotification {
  id: string
  kind: 'access_request' | 'access_change'
  requestId?: string
  title: string
  body: string
  date: string
  read: boolean
}

export interface PartnerChange {
  id: string
  text: string
  date: string
  read: boolean
  link?: 'action_required'
}
