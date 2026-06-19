// Domain types for the DeMo clickable demonstration.
// Everything lives in memory — resets to seed data on reload.

export type AddressType = 'physical' | 'mailing' | 'both'

export type AddressStatus = 'active' | 'pending' | 'inactive'

export interface Address {
  id: string // internal id (no longer shown in the UI)
  line: string
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
  title: string
  body: string
  date: string
  read: boolean
}

export interface OrgChange {
  id: string
  text: string
  date: string
  read: boolean
  link?: 'action_required'
}
