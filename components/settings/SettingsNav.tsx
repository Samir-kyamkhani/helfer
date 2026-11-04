import Link from "next/link";

const links = [
  ["Profile", "/settings/profile"],
  ["Security", "/settings/security"],
  ["Organizations", "/settings/organizations"],
  ["Members", "/settings/organizations/members"],
  ["Invitations", "/settings/organizations/invitations"],
  ["Billing", "/settings/billing"],
] as const;

export function SettingsNav() {
  return (
    <nav aria-label="Settings" className="flex flex-wrap gap-2 border-b border-white/8 pb-4">
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="rounded-full border border-white/8 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
