// Domain types for the DeMo clickable demonstration.
// Everything lives in memory — resets to seed data on reload.

export type AddressType = 'physical' | 'mailing' | 'both'

export type AddressStatus = 'active' | 'pending' | 'inactive'

// The user never picks the address capability. A street address is always
// usable as both physical and mailing; a PO Box is mailing-only. So `type`
// is effectively 'both' or 'mailing', determined automatically.
export interface Address {
  id: string // internal id (no longer shown in the UI)
  line: string
  unit?: string
  city: string
  state: string
  zip: string
  type: AddressType
  status: AddressStatus
}

// active   = currently sharing
// inactive = the underlying address was deactivated (organization sees last known)
// stopped  = the user stopped this sharing
// closed   = the organization closed it
export type AccessStatus = 'active' | 'inactive' | 'stopped' | 'closed'

export interface HistoryEvent {
  id: string
  date: string
  type: string
  status?: string
}

// A sharing connection between an organization and the user, for one address.
export interface Access {
  id: string
  orgName: string
  personName: string
  orgInternalUserId: string // the organization's internal id for this person
  requestType: AddressType
  physicalAddressId?: string
  mailingAddressId?: string
  // Denormalized last-known address text (used for synthetic org-side clients
  // whose address does not live in this user's address book).
  addressLabel?: string
  status: AccessStatus
  createdAt: string
  history: HistoryEvent[]
  snoozedUntil?: string | null
}

// A request created by an organization, waiting for the user to approve/reject.
export interface AccessRequest {
  id: string
  orgName: string
  firstName: string
  lastName: string
  userId: string
  requestType: AddressType
  status: 'pending' | 'approved' | 'rejected'
  sentAt: string
}

// A finished sharing relationship for a given address, shown under
// "Previous sharing" in the address detail.
export interface PreviousSharing {
  id: string
  addressId: string
  orgName: string
  requestType: AddressType
  date: string
  reason: 'stopped' | 'changed' | 'deactivated'
}

export interface UserNotification {
  id: string
  kind: 'event' | 'request' // 'request' links to the Requests section
  title: string
  body: string
  orgName?: string
  requestId?: string
  date: string
  read: boolean
}

// An entry in the organization's Notifications log. Each one links either to
// a specific client (accessId, opens in Share) or to a section.
export interface OrgChange {
  id: string
  text: string
  date: string
  read: boolean
  accessId?: string
  section?: 'action_required' | 'pending'
}
