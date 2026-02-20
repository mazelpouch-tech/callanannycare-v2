import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";

// ─── Country Data ────────────────────────────────────────────
interface Country {
  name: string;
  code: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { name: "Morocco", code: "MA", dial: "+212", flag: "\u{1F1F2}\u{1F1E6}" },
  { name: "France", code: "FR", dial: "+33", flag: "\u{1F1EB}\u{1F1F7}" },
  { name: "United States", code: "US", dial: "+1", flag: "\u{1F1FA}\u{1F1F8}" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "\u{1F1EC}\u{1F1E7}" },
  { name: "Germany", code: "DE", dial: "+49", flag: "\u{1F1E9}\u{1F1EA}" },
  { name: "Spain", code: "ES", dial: "+34", flag: "\u{1F1EA}\u{1F1F8}" },
  { name: "Italy", code: "IT", dial: "+39", flag: "\u{1F1EE}\u{1F1F9}" },
  { name: "Netherlands", code: "NL", dial: "+31", flag: "\u{1F1F3}\u{1F1F1}" },
  { name: "Belgium", code: "BE", dial: "+32", flag: "\u{1F1E7}\u{1F1EA}" },
  { name: "Switzerland", code: "CH", dial: "+41", flag: "\u{1F1E8}\u{1F1ED}" },
  { name: "Portugal", code: "PT", dial: "+351", flag: "\u{1F1F5}\u{1F1F9}" },
  { name: "Canada", code: "CA", dial: "+1", flag: "\u{1F1E8}\u{1F1E6}" },
  { name: "Australia", code: "AU", dial: "+61", flag: "\u{1F1E6}\u{1F1FA}" },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "\u{1F1F8}\u{1F1E6}" },
  { name: "UAE", code: "AE", dial: "+971", flag: "\u{1F1E6}\u{1F1EA}" },
  { name: "Qatar", code: "QA", dial: "+974", flag: "\u{1F1F6}\u{1F1E6}" },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "\u{1F1F0}\u{1F1FC}" },
  { name: "Bahrain", code: "BH", dial: "+973", flag: "\u{1F1E7}\u{1F1ED}" },
  { name: "Oman", code: "OM", dial: "+968", flag: "\u{1F1F4}\u{1F1F2}" },
  { name: "Egypt", code: "EG", dial: "+20", flag: "\u{1F1EA}\u{1F1EC}" },
  { name: "Tunisia", code: "TN", dial: "+216", flag: "\u{1F1F9}\u{1F1F3}" },
  { name: "Algeria", code: "DZ", dial: "+213", flag: "\u{1F1E9}\u{1F1FF}" },
  { name: "Libya", code: "LY", dial: "+218", flag: "\u{1F1F1}\u{1F1FE}" },
  { name: "Jordan", code: "JO", dial: "+962", flag: "\u{1F1EF}\u{1F1F4}" },
  { name: "Lebanon", code: "LB", dial: "+961", flag: "\u{1F1F1}\u{1F1E7}" },
  { name: "Iraq", code: "IQ", dial: "+964", flag: "\u{1F1EE}\u{1F1F6}" },
  { name: "Turkey", code: "TR", dial: "+90", flag: "\u{1F1F9}\u{1F1F7}" },
  { name: "India", code: "IN", dial: "+91", flag: "\u{1F1EE}\u{1F1F3}" },
  { name: "Pakistan", code: "PK", dial: "+92", flag: "\u{1F1F5}\u{1F1F0}" },
  { name: "China", code: "CN", dial: "+86", flag: "\u{1F1E8}\u{1F1F3}" },
  { name: "Japan", code: "JP", dial: "+81", flag: "\u{1F1EF}\u{1F1F5}" },
  { name: "South Korea", code: "KR", dial: "+82", flag: "\u{1F1F0}\u{1F1F7}" },
  { name: "Brazil", code: "BR", dial: "+55", flag: "\u{1F1E7}\u{1F1F7}" },
  { name: "Mexico", code: "MX", dial: "+52", flag: "\u{1F1F2}\u{1F1FD}" },
  { name: "Argentina", code: "AR", dial: "+54", flag: "\u{1F1E6}\u{1F1F7}" },
  { name: "Colombia", code: "CO", dial: "+57", flag: "\u{1F1E8}\u{1F1F4}" },
  { name: "Russia", code: "RU", dial: "+7", flag: "\u{1F1F7}\u{1F1FA}" },
  { name: "South Africa", code: "ZA", dial: "+27", flag: "\u{1F1FF}\u{1F1E6}" },
  { name: "Nigeria", code: "NG", dial: "+234", flag: "\u{1F1F3}\u{1F1EC}" },
  { name: "Kenya", code: "KE", dial: "+254", flag: "\u{1F1F0}\u{1F1EA}" },
  { name: "Ghana", code: "GH", dial: "+233", flag: "\u{1F1EC}\u{1F1ED}" },
  { name: "Senegal", code: "SN", dial: "+221", flag: "\u{1F1F8}\u{1F1F3}" },
  { name: "Ivory Coast", code: "CI", dial: "+225", flag: "\u{1F1E8}\u{1F1EE}" },
  { name: "Cameroon", code: "CM", dial: "+237", flag: "\u{1F1E8}\u{1F1F2}" },
  { name: "Tanzania", code: "TZ", dial: "+255", flag: "\u{1F1F9}\u{1F1FF}" },
  { name: "Ethiopia", code: "ET", dial: "+251", flag: "\u{1F1EA}\u{1F1F9}" },
  { name: "Sweden", code: "SE", dial: "+46", flag: "\u{1F1F8}\u{1F1EA}" },
  { name: "Norway", code: "NO", dial: "+47", flag: "\u{1F1F3}\u{1F1F4}" },
  { name: "Denmark", code: "DK", dial: "+45", flag: "\u{1F1E9}\u{1F1F0}" },
  { name: "Finland", code: "FI", dial: "+358", flag: "\u{1F1EB}\u{1F1EE}" },
  { name: "Poland", code: "PL", dial: "+48", flag: "\u{1F1F5}\u{1F1F1}" },
  { name: "Austria", code: "AT", dial: "+43", flag: "\u{1F1E6}\u{1F1F9}" },
  { name: "Czech Republic", code: "CZ", dial: "+420", flag: "\u{1F1E8}\u{1F1FF}" },
  { name: "Greece", code: "GR", dial: "+30", flag: "\u{1F1EC}\u{1F1F7}" },
  { name: "Romania", code: "RO", dial: "+40", flag: "\u{1F1F7}\u{1F1F4}" },
  { name: "Hungary", code: "HU", dial: "+36", flag: "\u{1F1ED}\u{1F1FA}" },
  { name: "Ireland", code: "IE", dial: "+353", flag: "\u{1F1EE}\u{1F1EA}" },
  { name: "New Zealand", code: "NZ", dial: "+64", flag: "\u{1F1F3}\u{1F1FF}" },
  { name: "Singapore", code: "SG", dial: "+65", flag: "\u{1F1F8}\u{1F1EC}" },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "\u{1F1F2}\u{1F1FE}" },
  { name: "Thailand", code: "TH", dial: "+66", flag: "\u{1F1F9}\u{1F1ED}" },
  { name: "Indonesia", code: "ID", dial: "+62", flag: "\u{1F1EE}\u{1F1E9}" },
  { name: "Philippines", code: "PH", dial: "+63", flag: "\u{1F1F5}\u{1F1ED}" },
  { name: "Vietnam", code: "VN", dial: "+84", flag: "\u{1F1FB}\u{1F1F3}" },
  { name: "Israel", code: "IL", dial: "+972", flag: "\u{1F1EE}\u{1F1F1}" },
  { name: "Ukraine", code: "UA", dial: "+380", flag: "\u{1F1FA}\u{1F1E6}" },
  { name: "Croatia", code: "HR", dial: "+385", flag: "\u{1F1ED}\u{1F1F7}" },
  { name: "Bulgaria", code: "BG", dial: "+359", flag: "\u{1F1E7}\u{1F1EC}" },
  { name: "Serbia", code: "RS", dial: "+381", flag: "\u{1F1F7}\u{1F1F8}" },
  { name: "Chile", code: "CL", dial: "+56", flag: "\u{1F1E8}\u{1F1F1}" },
  { name: "Peru", code: "PE", dial: "+51", flag: "\u{1F1F5}\u{1F1EA}" },
  { name: "Venezuela", code: "VE", dial: "+58", flag: "\u{1F1FB}\u{1F1EA}" },
  { name: "Ecuador", code: "EC", dial: "+593", flag: "\u{1F1EA}\u{1F1E8}" },
  { name: "Cuba", code: "CU", dial: "+53", flag: "\u{1F1E8}\u{1F1FA}" },
  { name: "Dominican Rep.", code: "DO", dial: "+1", flag: "\u{1F1E9}\u{1F1F4}" },
  { name: "Costa Rica", code: "CR", dial: "+506", flag: "\u{1F1E8}\u{1F1F7}" },
  { name: "Panama", code: "PA", dial: "+507", flag: "\u{1F1F5}\u{1F1E6}" },
  { name: "Jamaica", code: "JM", dial: "+1", flag: "\u{1F1EF}\u{1F1F2}" },
  { name: "Iceland", code: "IS", dial: "+354", flag: "\u{1F1EE}\u{1F1F8}" },
  { name: "Luxembourg", code: "LU", dial: "+352", flag: "\u{1F1F1}\u{1F1FA}" },
  { name: "Malta", code: "MT", dial: "+356", flag: "\u{1F1F2}\u{1F1F9}" },
  { name: "Cyprus", code: "CY", dial: "+357", flag: "\u{1F1E8}\u{1F1FE}" },
  { name: "Mauritius", code: "MU", dial: "+230", flag: "\u{1F1F2}\u{1F1FA}" },
  { name: "Madagascar", code: "MG", dial: "+261", flag: "\u{1F1F2}\u{1F1EC}" },
  { name: "Mauritania", code: "MR", dial: "+222", flag: "\u{1F1F2}\u{1F1F7}" },
  { name: "Mali", code: "ML", dial: "+223", flag: "\u{1F1F2}\u{1F1F1}" },
  { name: "Burkina Faso", code: "BF", dial: "+226", flag: "\u{1F1E7}\u{1F1EB}" },
  { name: "Niger", code: "NE", dial: "+227", flag: "\u{1F1F3}\u{1F1EA}" },
  { name: "Togo", code: "TG", dial: "+228", flag: "\u{1F1F9}\u{1F1EC}" },
  { name: "Benin", code: "BJ", dial: "+229", flag: "\u{1F1E7}\u{1F1EF}" },
  { name: "Congo", code: "CG", dial: "+242", flag: "\u{1F1E8}\u{1F1EC}" },
  { name: "DR Congo", code: "CD", dial: "+243", flag: "\u{1F1E8}\u{1F1E9}" },
  { name: "Rwanda", code: "RW", dial: "+250", flag: "\u{1F1F7}\u{1F1FC}" },
  { name: "Uganda", code: "UG", dial: "+256", flag: "\u{1F1FA}\u{1F1EC}" },
  { name: "Mozambique", code: "MZ", dial: "+258", flag: "\u{1F1F2}\u{1F1FF}" },
  { name: "Zimbabwe", code: "ZW", dial: "+263", flag: "\u{1F1FF}\u{1F1FC}" },
  { name: "Namibia", code: "NA", dial: "+264", flag: "\u{1F1F3}\u{1F1E6}" },
  { name: "Botswana", code: "BW", dial: "+267", flag: "\u{1F1E7}\u{1F1FC}" },
  { name: "Angola", code: "AO", dial: "+244", flag: "\u{1F1E6}\u{1F1F4}" },
  { name: "Afghanistan", code: "AF", dial: "+93", flag: "\u{1F1E6}\u{1F1EB}" },
  { name: "Bangladesh", code: "BD", dial: "+880", flag: "\u{1F1E7}\u{1F1E9}" },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "\u{1F1F1}\u{1F1F0}" },
  { name: "Nepal", code: "NP", dial: "+977", flag: "\u{1F1F3}\u{1F1F5}" },
  { name: "Myanmar", code: "MM", dial: "+95", flag: "\u{1F1F2}\u{1F1F2}" },
  { name: "Cambodia", code: "KH", dial: "+855", flag: "\u{1F1F0}\u{1F1ED}" },
  { name: "Laos", code: "LA", dial: "+856", flag: "\u{1F1F1}\u{1F1E6}" },
  { name: "Mongolia", code: "MN", dial: "+976", flag: "\u{1F1F2}\u{1F1F3}" },
  { name: "Hong Kong", code: "HK", dial: "+852", flag: "\u{1F1ED}\u{1F1F0}" },
  { name: "Taiwan", code: "TW", dial: "+886", flag: "\u{1F1F9}\u{1F1FC}" },
  { name: "Macao", code: "MO", dial: "+853", flag: "\u{1F1F2}\u{1F1F4}" },
  { name: "Yemen", code: "YE", dial: "+967", flag: "\u{1F1FE}\u{1F1EA}" },
  { name: "Syria", code: "SY", dial: "+963", flag: "\u{1F1F8}\u{1F1FE}" },
  { name: "Palestine", code: "PS", dial: "+970", flag: "\u{1F1F5}\u{1F1F8}" },
  { name: "Georgia", code: "GE", dial: "+995", flag: "\u{1F1EC}\u{1F1EA}" },
  { name: "Armenia", code: "AM", dial: "+374", flag: "\u{1F1E6}\u{1F1F2}" },
  { name: "Azerbaijan", code: "AZ", dial: "+994", flag: "\u{1F1E6}\u{1F1FF}" },
  { name: "Kazakhstan", code: "KZ", dial: "+7", flag: "\u{1F1F0}\u{1F1FF}" },
  { name: "Uzbekistan", code: "UZ", dial: "+998", flag: "\u{1F1FA}\u{1F1FF}" },
  { name: "Iran", code: "IR", dial: "+98", flag: "\u{1F1EE}\u{1F1F7}" },
  { name: "Slovakia", code: "SK", dial: "+421", flag: "\u{1F1F8}\u{1F1F0}" },
  { name: "Slovenia", code: "SI", dial: "+386", flag: "\u{1F1F8}\u{1F1EE}" },
  { name: "Lithuania", code: "LT", dial: "+370", flag: "\u{1F1F1}\u{1F1F9}" },
  { name: "Latvia", code: "LV", dial: "+371", flag: "\u{1F1F1}\u{1F1FB}" },
  { name: "Estonia", code: "EE", dial: "+372", flag: "\u{1F1EA}\u{1F1EA}" },
  { name: "Moldova", code: "MD", dial: "+373", flag: "\u{1F1F2}\u{1F1E9}" },
  { name: "Albania", code: "AL", dial: "+355", flag: "\u{1F1E6}\u{1F1F1}" },
  { name: "North Macedonia", code: "MK", dial: "+389", flag: "\u{1F1F2}\u{1F1F0}" },
  { name: "Montenegro", code: "ME", dial: "+382", flag: "\u{1F1F2}\u{1F1EA}" },
  { name: "Bosnia", code: "BA", dial: "+387", flag: "\u{1F1E7}\u{1F1E6}" },
  { name: "Kosovo", code: "XK", dial: "+383", flag: "\u{1F1FD}\u{1F1F0}" },
  { name: "Sudan", code: "SD", dial: "+249", flag: "\u{1F1F8}\u{1F1E9}" },
  { name: "South Sudan", code: "SS", dial: "+211", flag: "\u{1F1F8}\u{1F1F8}" },
  { name: "Somalia", code: "SO", dial: "+252", flag: "\u{1F1F8}\u{1F1F4}" },
  { name: "Djibouti", code: "DJ", dial: "+253", flag: "\u{1F1E9}\u{1F1EF}" },
  { name: "Eritrea", code: "ER", dial: "+291", flag: "\u{1F1EA}\u{1F1F7}" },
  { name: "Gabon", code: "GA", dial: "+241", flag: "\u{1F1EC}\u{1F1E6}" },
  { name: "Equatorial Guinea", code: "GQ", dial: "+240", flag: "\u{1F1EC}\u{1F1F6}" },
  { name: "Chad", code: "TD", dial: "+235", flag: "\u{1F1F9}\u{1F1E9}" },
  { name: "Central African Rep.", code: "CF", dial: "+236", flag: "\u{1F1E8}\u{1F1EB}" },
  { name: "Guinea", code: "GN", dial: "+224", flag: "\u{1F1EC}\u{1F1F3}" },
  { name: "Guinea-Bissau", code: "GW", dial: "+245", flag: "\u{1F1EC}\u{1F1FC}" },
  { name: "Sierra Leone", code: "SL", dial: "+232", flag: "\u{1F1F8}\u{1F1F1}" },
  { name: "Liberia", code: "LR", dial: "+231", flag: "\u{1F1F1}\u{1F1F7}" },
  { name: "Gambia", code: "GM", dial: "+220", flag: "\u{1F1EC}\u{1F1F2}" },
  { name: "Cape Verde", code: "CV", dial: "+238", flag: "\u{1F1E8}\u{1F1FB}" },
  { name: "Zambia", code: "ZM", dial: "+260", flag: "\u{1F1FF}\u{1F1F2}" },
  { name: "Malawi", code: "MW", dial: "+265", flag: "\u{1F1F2}\u{1F1FC}" },
  { name: "Lesotho", code: "LS", dial: "+266", flag: "\u{1F1F1}\u{1F1F8}" },
  { name: "Eswatini", code: "SZ", dial: "+268", flag: "\u{1F1F8}\u{1F1FF}" },
  { name: "Comoros", code: "KM", dial: "+269", flag: "\u{1F1F0}\u{1F1F2}" },
  { name: "Seychelles", code: "SC", dial: "+248", flag: "\u{1F1F8}\u{1F1E8}" },
  { name: "Maldives", code: "MV", dial: "+960", flag: "\u{1F1F2}\u{1F1FB}" },
  { name: "Fiji", code: "FJ", dial: "+679", flag: "\u{1F1EB}\u{1F1EF}" },
  { name: "Papua New Guinea", code: "PG", dial: "+675", flag: "\u{1F1F5}\u{1F1EC}" },
  { name: "Samoa", code: "WS", dial: "+685", flag: "\u{1F1FC}\u{1F1F8}" },
  { name: "Tonga", code: "TO", dial: "+676", flag: "\u{1F1F9}\u{1F1F4}" },
  { name: "Haiti", code: "HT", dial: "+509", flag: "\u{1F1ED}\u{1F1F9}" },
  { name: "Honduras", code: "HN", dial: "+504", flag: "\u{1F1ED}\u{1F1F3}" },
  { name: "Guatemala", code: "GT", dial: "+502", flag: "\u{1F1EC}\u{1F1F9}" },
  { name: "El Salvador", code: "SV", dial: "+503", flag: "\u{1F1F8}\u{1F1FB}" },
  { name: "Nicaragua", code: "NI", dial: "+505", flag: "\u{1F1F3}\u{1F1EE}" },
  { name: "Uruguay", code: "UY", dial: "+598", flag: "\u{1F1FA}\u{1F1FE}" },
  { name: "Paraguay", code: "PY", dial: "+595", flag: "\u{1F1F5}\u{1F1FE}" },
  { name: "Bolivia", code: "BO", dial: "+591", flag: "\u{1F1E7}\u{1F1F4}" },
  { name: "Trinidad & Tobago", code: "TT", dial: "+1", flag: "\u{1F1F9}\u{1F1F9}" },
  { name: "Barbados", code: "BB", dial: "+1", flag: "\u{1F1E7}\u{1F1E7}" },
  { name: "Bahamas", code: "BS", dial: "+1", flag: "\u{1F1E7}\u{1F1F8}" },
  { name: "Bermuda", code: "BM", dial: "+1", flag: "\u{1F1E7}\u{1F1F2}" },
  { name: "Guyana", code: "GY", dial: "+592", flag: "\u{1F1EC}\u{1F1FE}" },
  { name: "Suriname", code: "SR", dial: "+597", flag: "\u{1F1F8}\u{1F1F7}" },
  { name: "Belize", code: "BZ", dial: "+501", flag: "\u{1F1E7}\u{1F1FF}" },
  { name: "Monaco", code: "MC", dial: "+377", flag: "\u{1F1F2}\u{1F1E8}" },
  { name: "Liechtenstein", code: "LI", dial: "+423", flag: "\u{1F1F1}\u{1F1EE}" },
  { name: "Andorra", code: "AD", dial: "+376", flag: "\u{1F1E6}\u{1F1E9}" },
  { name: "San Marino", code: "SM", dial: "+378", flag: "\u{1F1F8}\u{1F1F2}" },
  { name: "Vatican City", code: "VA", dial: "+39", flag: "\u{1F1FB}\u{1F1E6}" },
  { name: "Brunei", code: "BN", dial: "+673", flag: "\u{1F1E7}\u{1F1F3}" },
  { name: "Timor-Leste", code: "TL", dial: "+670", flag: "\u{1F1F9}\u{1F1F1}" },
  { name: "Bhutan", code: "BT", dial: "+975", flag: "\u{1F1E7}\u{1F1F9}" },
];

// Detect country from existing phone value
function detectCountry(phone: string): Country {
  if (!phone) return COUNTRIES[0]; // Default Morocco
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Try matching longest dial codes first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (cleaned.startsWith(c.dial) || cleaned.startsWith(c.dial.replace("+", ""))) {
      return c;
    }
  }
  return COUNTRIES[0];
}

// Extract local number (without country code)
function extractLocal(phone: string, country: Country): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  const dialNoPlus = country.dial.replace("+", "");
  if (cleaned.startsWith(country.dial)) return cleaned.slice(country.dial.length);
  if (cleaned.startsWith(dialNoPlus)) return cleaned.slice(dialNoPlus.length);
  if (cleaned.startsWith("+")) return cleaned; // different code, return as-is
  if (cleaned.startsWith("0")) return cleaned.slice(1); // local with leading 0
  return cleaned;
}

// ─── Component ───────────────────────────────────────────────

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  className?: string;
}

export default function PhoneInput({ value, onChange, placeholder, className }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<Country>(() => detectCountry(value));
  const [localNum, setLocalNum] = useState(() => extractLocal(value, detectCountry(value)));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Sync from external value changes
  useEffect(() => {
    if (value) {
      const det = detectCountry(value);
      setCountry(det);
      setLocalNum(extractLocal(value, det));
    }
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q)
    );
  }, [search]);

  const handleCountrySelect = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setSearch("");
    const full = localNum ? `${c.dial}${localNum}` : "";
    onChange(full);
  };

  const handleLocalChange = (val: string) => {
    // Only allow digits
    const digits = val.replace(/[^\d]/g, "");
    setLocalNum(digits);
    const full = digits ? `${country.dial}${digits}` : "";
    onChange(full);
  };

  return (
    <div className={`relative flex ${className || ""}`} ref={dropdownRef}>
      {/* Country selector button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 border border-border border-r-0 rounded-l-lg bg-muted/50 hover:bg-muted transition-colors text-sm shrink-0"
      >
        <span className="text-base leading-none">{country.flag}</span>
        <span className="text-xs text-muted-foreground font-medium">{country.dial}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {/* Phone number input */}
      <input
        type="tel"
        value={localNum}
        onChange={(e) => handleLocalChange(e.target.value)}
        placeholder={placeholder || "Phone number"}
        className="flex-1 min-w-0 px-3 py-2.5 border border-border rounded-r-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 max-h-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Country list */}
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground text-center">No countries found</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors text-left ${
                    c.code === country.code ? "bg-primary/5 text-primary font-medium" : "text-foreground"
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
