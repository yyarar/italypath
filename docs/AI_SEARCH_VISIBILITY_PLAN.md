# ItalyPath AI Search Visibility Plan

Last updated: 15 August 2026

## Objective

Make ItalyPath a useful, citable planning source for Turkish students considering higher education in Italy. This work serves people first: Google’s AI Search guidance treats core SEO, useful original material, crawlability, and a good page experience as the foundation—not separate “AI-only” pages or manipulation tactics.

## Baseline

- The public home page is indexed for ItalyPath and communicates the university, programme, scholarship, ISEE, city-guide, and SAT surfaces.
- `robots.txt` has no AI-crawler-specific blocks. The public routes are allowed by the general rule, while account, staff, API, and mentor routes remain restricted.
- The XML sitemap includes the public discovery pages plus university and programme pages.
- University programme dossiers, regional scholarship records, and city guides already expose valuable source and freshness signals in the product.
- Before this change, the home-page count-up component emitted `0 university / 0 programme` in server HTML. Search snippets could therefore repeat a false number; the component now renders the real value before client-side animation.
- `public/llms.txt` now gives non-Google assistants a concise, factual map of the site and explicit time-sensitive-information boundaries. It is supplementary; it is not a Google AI Overview ranking mechanism.

## Priority query set

| User intent | Query examples | Best current ItalyPath page | Current gap |
| --- | --- | --- | --- |
| Find a programme | `İtalya İngilizce lisans programları`, `İtalya İngilizce yüksek lisans` | `/universities`, university and programme pages | A stable editorial overview explaining how to narrow choices is missing. |
| Compare scholarships | `İtalya DSU bursu`, `İtalya bölgesel bursları`, `DSU ISEE şartı` | `/scholarships`, `/isee` | A sourced explainer of the process and terminology is missing; amounts and thresholds must stay regional and year-specific. |
| Estimate affordability | `İtalya öğrenci yaşam maliyeti`, `Milano öğrenci oda kirası` | `/cities` | City data exists, but a transparent comparison page or a set of city-specific crawlable summaries would make comparisons easier. |
| Understand admissions | `İtalya üniversite başvurusu nasıl yapılır`, `İtalya üniversitesi gereken belgeler` | Programme dossiers | There is no comprehensive, official-source-led admissions hub. |
| Validate a specific choice | `[üniversite] [program] kabul şartları` | Programme detail pages | Continue expanding only source-backed dossiers; never fill unknown dates or requirements with estimates. |

## Content roadmap

1. **Admissions hub — highest priority.** Publish one human-readable, maintained guide for Turkish applicants: choosing a programme, university application, official pre-enrolment, document preparation, and where the process varies. Attribute the editor/reviewer, show a last-updated date, and cite primary sources such as the relevant university and Universitaly. Do not state a universal deadline, visa rule, or document list when it varies.
2. **Scholarship and ISEE explainer.** Complement the existing calculator and map with clear definitions, a regional-variation table, and links to official calls. The page must say that the calculator is an estimate and must not imply eligibility.
3. **Programme-selection guide.** Explain bachelor’s, master’s, and single-cycle routes; use the live directory for discovery and programme dossiers for requirements. Answer the real question before a user searches 1,000+ programmes.
4. **City decision guide.** Add only sourced comparison criteria (cost source/date, transport, university availability) and make every estimate visibly attributable.

Each guide should have one clear H1, a direct opening answer, descriptive H2s that mirror the student’s questions, normal readable paragraphs, official-source links near changeable claims, a named author/reviewer and update date. Add schema only when the visible page genuinely supports it; do not add synthetic FAQs, ratings, or unverified organizational claims.

## Citation and entity strategy

- Keep programme, scholarship, and city claims tied to the primary source already stored in the product.
- Build genuine third-party presence through useful, disclosed participation in Turkish student communities and reputable education publications. Do not manufacture Reddit, Wikipedia, directory, or review-site mentions.
- Keep the ItalyPath entity consistent: name `ItalyPath`, canonical domain `https://italypath.app`, Turkish-student / Italy higher-education planning scope, and the same factual description across controlled profiles.
- When a verified official social profile, logo, legal organization name, or subject-matter reviewer becomes available, add it to the visible site and then to Organization structured data. Do not infer it from unverified assets or profiles.

## Measurement cadence

Run the following 10-query check monthly in Google AI features, ChatGPT Search, Perplexity, Gemini, and Copilot. Record whether an answer appears, ItalyPath is mentioned or linked, the cited page, competing sources, and whether the answer describes the brand correctly.

1. `İtalya'da üniversite nasıl okunur?`
2. `İtalya İngilizce lisans programları`
3. `İtalya İngilizce yüksek lisans programları`
4. `İtalya DSU bursu nedir?`
5. `İtalya ISEE nasıl hesaplanır?`
6. `İtalya öğrenci şehirleri yaşam maliyeti`
7. `İtalya üniversite başvurusu için hangi belgeler gerekir?`
8. `Politecnico di Milano İngilizce programları`
9. `University of Bologna İngilizce yüksek lisans programları`
10. `ItalyPath nedir?`

Use Google Search Console’s Generative AI performance report alongside normal performance, index coverage, and Core Web Vitals reports. Do not infer AI citation share from traditional rank alone. `npm run check:ai-search` protects the implemented baseline during future edits.

## Guardrails

- Do not create hidden text, AI-only pages, keyword-stuffed templates, fabricated testimonials, or fabricated third-party mentions.
- Do not convert a changing rule, deadline, fee, scholarship threshold, or visa requirement into an unsourced evergreen fact.
- Do not treat `llms.txt` as an indexing or ranking shortcut. It is a concise discovery aid for some non-Google systems.

## References

- Google Search Central: [Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- Perplexity: [How Perplexity follows robots.txt](https://www.perplexity.ai/help-center/en/articles/10354969-how-does-perplexity-follow-robots-txt)
- Perplexity: [Crawler documentation](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
