import { createNavigation } from "next-intl/navigation";

export const routing = {
  // A list of all locales that are supported
  locales: ["en", "bn", "ar"],

  // Used when no locale matches
  defaultLocale: "en",
};

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
// @ts-ignore - bypassing strict types from defineRouting if it's missing
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
