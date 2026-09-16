import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface DetailBreadcrumbProps {
  items: BreadcrumbItem[];
  current: string;
  ariaLabel: string;
}

// Gorunur ekmek kirintisi: sayfadaki BreadcrumbList JSON-LD ile ayni sira (SEO_AUDIT.md §22).
export function DetailBreadcrumb({ items, current, ariaLabel }: DetailBreadcrumbProps) {
  return (
    <nav aria-label={ariaLabel} className="text-xs font-semibold text-[var(--editorial-muted)]">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item) => (
          <li key={item.href} className="flex items-center gap-x-2">
            <Link
              href={item.href}
              className="transition hover:text-[var(--editorial-terracotta-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--editorial-sage)]"
            >
              {item.label}
            </Link>
            <span aria-hidden="true">›</span>
          </li>
        ))}
        <li aria-current="page" className="min-w-0 truncate text-[var(--editorial-ink)]">
          {current}
        </li>
      </ol>
    </nav>
  );
}
