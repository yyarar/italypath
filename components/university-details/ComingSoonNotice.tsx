interface ComingSoonNoticeProps {
  title: string;
  body: string;
}

export function ComingSoonNotice({ title, body }: ComingSoonNoticeProps) {
  return (
    <section className="border border-[var(--editorial-border)] bg-[var(--editorial-surface)] px-5 py-6 sm:px-7 sm:py-8">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--editorial-terracotta)]">
        {title}
      </p>
      <p className="mt-3 max-w-3xl font-serif text-xl leading-8 text-[var(--editorial-ink)] sm:text-2xl sm:leading-9">
        {body}
      </p>
    </section>
  );
}
