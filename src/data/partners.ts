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
  /** Percentage of each booking's total owed to the partner as commission */
  commissionPercent: number;
  /** Former names still present in old bookings' notes tags */
  aliases?: string[];
}

export const PARTNERS: Record<string, PartnerConfig> = {
  "club-med": {
    slug: "club-med",
    name: "Club Med",
    rate: 10,
    taxiFee: 10,
    commissionPercent: 0,
  },
  seanjeztagana: {
    slug: "seanjeztagana",
    name: "Seanjeztagana Agency",
    rate: 12, // 12€/hr because the agency takes a 20% commission
    taxiFee: 10,
    commissionPercent: 20,
    aliases: ["Seanjeztagana Conciergerie"],
  },
};

export const PARTNER_LIST: PartnerConfig[] = Object.values(PARTNERS);

/** Matches the "--- PARTNER: <name> ---" tag written into partner bookings' notes. */
const PARTNER_TAG_RE = /--- PARTNER: (.+?) ---/;

/** Returns the partner a booking belongs to, based on its notes tag, or null. */
export function getBookingPartner(notes: string | null | undefined): PartnerConfig | null {
  if (!notes) return null;
  const match = notes.match(PARTNER_TAG_RE);
  if (!match) return null;
  const tagged = match[1].trim();
  return (
    PARTNER_LIST.find((p) => p.name === tagged || p.aliases?.includes(tagged)) ?? null
  );
}
