// Centralized status/type enums (§7 "Les statuts doivent être centralisés dans le code").
// Every value here mirrors a Postgres enum in supabase/migrations/0002_enums.sql — keep
// both in sync.

export const PROPERTY_STATUSES = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
  ARCHIVED: "archived",
} as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[keyof typeof PROPERTY_STATUSES];

export const MANAGER_PHONE_VISIBILITY = {
  HIDDEN: "hidden",
  ADMIN_ONLY: "admin_only",
  REVEALED: "revealed",
} as const;
export type ManagerPhoneVisibility =
  (typeof MANAGER_PHONE_VISIBILITY)[keyof typeof MANAGER_PHONE_VISIBILITY];

export const BOOKING_TYPES = {
  CLASSIC: "classic",
  SHARED: "shared",
} as const;
export type BookingType = (typeof BOOKING_TYPES)[keyof typeof BOOKING_TYPES];

export const BOOKING_STATUSES = {
  DRAFT: "draft",
  PENDING: "pending",
  AWAITING_PAYMENT: "awaiting_payment",
  PAYMENT_RECEIVED: "payment_received",
  AWAITING_OWNER_CONFIRMATION: "awaiting_owner_confirmation",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  CHECKED_OUT: "checked_out",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  draft: "Brouillon",
  pending: "En attente",
  awaiting_payment: "En attente de paiement",
  payment_received: "Paiement reçu",
  awaiting_owner_confirmation: "En attente de confirmation du gérant",
  confirmed: "Confirmée",
  checked_in: "Arrivée effectuée",
  checked_out: "Départ effectué",
  completed: "Terminée",
  cancelled: "Annulée",
  rejected: "Refusée",
  expired: "Expirée",
};

// A booking can no longer be cancelled once it has reached one of these states.
export const NON_CANCELLABLE_BOOKING_STATUSES: readonly BookingStatus[] = [
  BOOKING_STATUSES.COMPLETED,
  BOOKING_STATUSES.CANCELLED,
  BOOKING_STATUSES.CHECKED_IN,
  BOOKING_STATUSES.CHECKED_OUT,
];

export const SEGMENT_STATUSES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CHECKED_IN: "checked_in",
  CHECKED_OUT: "checked_out",
  CANCELLED: "cancelled",
} as const;
export type SegmentStatus = (typeof SEGMENT_STATUSES)[keyof typeof SEGMENT_STATUSES];

export const SHARED_REQUEST_STATUSES = {
  SEARCHING_PARTNER: "searching_partner",
  PARTNER_FOUND: "partner_found",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  CONVERTED: "converted",
} as const;
export type SharedRequestStatus =
  (typeof SHARED_REQUEST_STATUSES)[keyof typeof SHARED_REQUEST_STATUSES];

export const PAYMENT_STATUSES = {
  PENDING: "pending",
  PAYMENT_SUBMITTED: "payment_submitted",
  PAYMENT_CONFIRMED: "payment_confirmed",
  PAYMENT_REJECTED: "payment_rejected",
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente de paiement",
  payment_submitted: "Déclaré payé — en attente de vérification",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
};

export const INTERMEDIATION_STATUSES = {
  NEW: "new",
  CONTACTED: "contacted",
  RESIDENCE_FOUND: "residence_found",
  CLIENT_REFERRED: "client_referred",
  RESERVATION_CREATED: "reservation_created",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
export type IntermediationStatus =
  (typeof INTERMEDIATION_STATUSES)[keyof typeof INTERMEDIATION_STATUSES];

export const CASH_TRANSACTION_TYPES = {
  IN: "in",
  OUT: "out",
} as const;
export type CashTransactionType =
  (typeof CASH_TRANSACTION_TYPES)[keyof typeof CASH_TRANSACTION_TYPES];

export const AVAILABILITY_BLOCK_REASONS = {
  MAINTENANCE: "maintenance",
  CLEANING: "cleaning",
  MANUAL: "manual",
  OTHER: "other",
} as const;
export type AvailabilityBlockReason =
  (typeof AVAILABILITY_BLOCK_REASONS)[keyof typeof AVAILABILITY_BLOCK_REASONS];

export const COMMISSION_TYPES = {
  FIXED: "fixed",
  PERCENTAGE: "percentage",
} as const;
export type CommissionType = (typeof COMMISSION_TYPES)[keyof typeof COMMISSION_TYPES];

// Maximum number of participants in a shared booking (§8, §9 règle 1) — never change
// without revisiting the DB trigger trg_check_max_segments.
export const MAX_SHARED_BOOKING_PARTICIPANTS = 2;
