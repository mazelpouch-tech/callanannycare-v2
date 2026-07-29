/**
 * Partner booking portal configuration.
 *
 * Each partner gets its own booking link at /book/<slug> (and a QR code in
 * Admin → QR Codes). The portal reuses the exact same booking flow, nanny
 * database, availability and questions as the main /book page — only the
 * partner name shown in the header and the pricing below differ.
 *
 * To change a partner's pricing, edit `rate` (EUR per hour) and `taxiFee`
 * (flat EUR fee for bookings touching the 7 PM – 7 AM night window) here.
 */
export interface PartnerConfig {
  slug: string;
  name: string;
  /** EUR per hour */
  rate: number;
  /** Flat EUR fee added per night-window booking day */
  taxiFee: number;
}

export const PARTNERS: Record<string, PartnerConfig> = {
  "club-med": {
    slug: "club-med",
    name: "Club Med",
    rate: 10,
    taxiFee: 10,
  },
  seanjeztagana: {
    slug: "seanjeztagana",
    name: "Seanjeztagana Conciergerie",
    rate: 10,
    taxiFee: 10,
  },
};

export const PARTNER_LIST: PartnerConfig[] = Object.values(PARTNERS);
