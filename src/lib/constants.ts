export const JIGAWA_LGAS = [
  "Auyo", "Babura", "Biriniwa", "Birnin Kudu", "Buji", "Dutse",
  "Gagarawa", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa",
  "Hadejia", "Jahun", "Kafin Hausa", "Kaugama", "Kazaure",
  "Kiri Kasama", "Kiyawa", "Maigatari", "Malam Madori",
  "Miga", "Ringim", "Roni", "Sule Tankarkar",
  "Taura", "Yankwashi"
] as const;

export const SENATORIAL_ZONES = {
  "Jigawa North-West": ["Babura", "Garki", "Gumel", "Gagarawa", "Kaugama", "Maigatari", "Sule Tankarkar", "Taura", "Kazaure", "Roni", "Gwiwa", "Yankwashi"],
  "Jigawa North-East": ["Hadejia", "Kafin Hausa", "Biriniwa", "Guri", "Kiri Kasama", "Auyo", "Malam Madori", "Jahun"],
  "Jigawa South": ["Dutse", "Birnin Kudu", "Buji", "Gwaram", "Kiyawa", "Miga", "Ringim"],
} as const;

export const QUALIFICATION_TYPES = [
  "SSCE/WAEC", "NCE", "ND/OND", "HND", "B.Sc/B.A/B.Ed/B.Tech",
  "PGD", "M.Sc/M.A/M.Ed", "PhD", "Professor", "Other"
] as const;

export const EMPLOYMENT_STATUSES = [
  "Unemployed", "Self-employed", "Employed", "Retired"
] as const;

export const SECTORS = [
  "Public", "Private", "NGO", "International Organization", "Self-employed"
] as const;

export const SKILL_CATEGORIES = [
  "ICT & Technology", "Engineering", "Health & Medical", "Education & Teaching",
  "Agriculture", "Business & Finance", "Legal", "Media & Communications",
  "Arts & Creative", "Trades & Artisan", "Science & Research", "Security & Law Enforcement",
  "Administration", "Transport & Logistics", "Other"
] as const;

export const MENTOR_CATEGORIES = [
  "Academics", "Civil Servants", "Business Owners", "ICT Experts",
  "Medical Professionals", "Engineers", "Entrepreneurs", "Diaspora Professionals",
] as const;

export type LGA = typeof JIGAWA_LGAS[number];

export const USER_TYPES = [
  { value: "job_seeker", label: "Job Seeker" },
  { value: "student", label: "Student" },
  { value: "professional", label: "Professional" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "civil_servant", label: "Civil Servant" },
  { value: "artisan", label: "Artisan / Tradesperson" },
  { value: "farmer", label: "Farmer" },
  { value: "retiree", label: "Retiree" },
] as const;
