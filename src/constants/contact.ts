// ============================================================
// CONTACT CONSTANTS - Centralized contact information
// ============================================================

import { Mail, Phone, MapPin, Linkedin } from "lucide-react";
import { PERSONAL_INFO, PORTFOLIO_CONTENT } from "./data";

// ============ HELPER - Extract domain from URL ============
const extractDomain = (url: string): string =>
  url.replace(/https?:\/\//, "").replace(/\/$/, "");

// ============ CONTACT INFO FOR DISPLAY ============
export const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: PERSONAL_INFO.email,
    href: `mailto:${PERSONAL_INFO.email}`,
  },
  {
    icon: Phone,
    label: "Phone",
    value: PERSONAL_INFO.phone,
    href: `tel:${PERSONAL_INFO.phone.replace(/\s/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Location",
    value: `${PERSONAL_INFO.city}, ${PERSONAL_INFO.location}`,
    href: `https://maps.google.com/?q=${PERSONAL_INFO.city},${PERSONAL_INFO.location}`,
  },
];

// ============ SOCIAL LINKS FOR CONTACT SECTION ============
export const CONTACT_SOCIAL_LINKS = [
  {
    icon: Linkedin,
    label: "LinkedIn",
    href: PERSONAL_INFO.linkedin,
    color:
      "text-blue-600 hover:text-blue-700 dark:text-blue-600 dark:hover:text-blue-700",
  },
];

// ============ DISPLAY STRINGS (derived, not duplicated) ============
export const CONTACT_DISPLAY_STRINGS = {
  portfolioUrl: extractDomain(PERSONAL_INFO.portfolio),
  linkedinUrl: extractDomain(PERSONAL_INFO.linkedin),
};

// ============ CONTACT FORM CONFIGURATION ============
export const CONTACT_FORM_CONFIG = {
  recipientEmail: PERSONAL_INFO.email,
  successMessage: "Message sent!",
  successDescription: "Thanks—I'll be in touch soon.",
  errorMessage: "Send failed",
  errorDescription: "Try again later.",
  configErrorMessage: "Configuration error",
  configErrorDescription: "Please check EmailJS keys.",
};

// ============ AVAILABILITY MESSAGE ============
export const AVAILABILITY_MESSAGE =
  PORTFOLIO_CONTENT.engagement.availabilityMessage;
