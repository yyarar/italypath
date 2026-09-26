# docs/superpowers — Tasarım ve Plan Belgeleri Durum İndeksi

Tarih: 2026-09-21 · Doğrulandığı commit: `ab38759`

Bu indeks her brif/spec/plan belgesinin bugünkü durumunu ve kanıtını verir; aynı satır belgenin kendi başına da yazılmıştır. Plan dosyalarındaki checkbox'lar (33 planda 14 işaretli / 1.427 işaretsiz) ilerlemeyi **yansıtmaz** ve toplu işaretlenmez. Belgeler tasarım tarihi ve o günkü kararlar için korunur; güncel mimari `AGENT_CONTEXT.md`, açık işler `docs/STATUS.md`.

Durum sözlüğü: **UYGULANDI** (kanıtlı commit/kod), **KISMEN** (bazı görevler bilinçli olarak yapılmadı veya kapsam daraltıldı), **YERİNE GEÇTİ** (uygulandı ama daha sonraki bir tasarımla değiştirildi), **İPTAL**, **BAŞKA PROJE** (bu repoda uygulanmaz), **LEGACY** (iptal edilmiş hattın kalıntısı), **AKTİF REFERANS** (hâlâ kullanılan runbook/şablon).

Yeni belge eklerken: H1 altına `Durum (tarih): **DURUM** — kanıt.` satırı yaz ve bu tabloya bir satır ekle.

| Belge | Tür | Tarih | Durum | Kanıt / not |
| --- | --- | --- | --- | --- |
| `briefs/2026-09-17-program-detail-pages-brief.md` | brif | 2026-09-17 | **KISMEN** | Task 1-5 ve 7-9 uygulandı (Deploy 1-4, 17-21 Eylül; SEO_AUDIT §23); Task 6 İPTAL (Kerem, 21 Eylül). Brifteki 'uygulamaya geçilmez' notu tamamlanmıştır |
| `specs/2026-05-10-italypath-editorial-ui-design.md` | spec | 2026-05-10 | **UYGULANDI** | 5eab41f (2026-05-10). Ana sayfa 2026-09-15'te ön görüşme odağıyla yeniden düzenlendi (2848933) |
| `specs/2026-05-12-universities-field-guide-redesign-design.md` | spec | 2026-05-12 | **UYGULANDI** | ad109fc (2026-05-12); 2026-06-22 SEO 2 ile server wrapper + client leaf yapısına taşındı (836592e) |
| `specs/2026-05-14-communities-editorial-atlas-design.md` | spec | 2026-05-14 | **UYGULANDI** | 6055c7a (2026-05-14) |
| `specs/2026-05-14-scholarships-editorial-atlas-design.md` | spec | 2026-05-14 | **UYGULANDI** | 2026-05-14 serisi; kod: components/scholarships/ScholarshipsExplorer.tsx |
| `specs/2026-05-15-mentor-consultation-desks-design.md` | spec | 2026-05-15 | **UYGULANDI** | Sonraki değişiklikler: 791c369 yeniden adlandırma ve 6a5241b AI masası paused (2026-07-23), 2e711fc gönüllü masa (07-20), 84e40df uzman masası (08-11) |
| `specs/2026-05-18-hub-redesign-design.md` | spec | 2026-05-18 | **YERİNE GEÇTİ** | Uygulandı (05-18/20), 2026-07-02 hub onboarding ile stage/bento modeli kaldırıldı (5522606). Güncel: specs/2026-07-02-hub-onboarding-design.md |
| `specs/2026-05-19-home-wiring-auto-advance-design.md` | spec | 2026-05-19 | **YERİNE GEÇTİ** | Uygulandı 2026-05-20 (324d3d0, a1d119b, 9a9de8d); stage modeli 2026-07-02'de kaldırıldı (5522606) |
| `specs/2026-05-22-university-campus-portrait-details-design.md` | spec | 2026-05-22 | **UYGULANDI** | 7ace805 + 1e1ca11 (2026-05-22). Sonrası: 09-16 breadcrumb/ilgili bağlantılar (4c112cf), 17-21 Eylül program detay turu |
| `specs/2026-05-27-program-deadline-scraping-design.md` | spec | 2026-05-27 | **İPTAL** | Scrape hattı Haziran 2026'da Task 12'de durduruldu (Sapienza çıktısı gürültülü); yerel deadline altyapısı 2026-07-22'de kaldırıldı; kalan hedef listesi, kaydetme betiği ve runbook 2026-09-26'da silindi. Gerçek tarihler program_admission_details'ten gelir |
| `specs/2026-06-01-belge-cuzdani-redesign-design.md` | spec | 2026-06-01 | **UYGULANDI** | 78661a5 + e481668 (2026-06-02) |
| `specs/2026-06-02-bologna-program-admission-details-design.md` | spec | 2026-06-02 | **UYGULANDI** | 2026-06-02 (41c3b9c); scripts/import-bologna-program-details.mjs |
| `specs/2026-06-12-home-schools-editorial-redesign-design.md` | spec | 2026-06-12 | **BAŞKA PROJE** | 'ItalyPath iOS' pilotu; bu repoda uygulanmaz, ayrı 'remake' mobil projesi kapsamı |
| `specs/2026-06-12-yasal-sayfalar-design.md` | spec | 2026-06-12 | **UYGULANDI** | a69300c (2026-06-12); iletişim adresi 2bfd9f2 (2026-07-21). Hukukçu incelemesi açık (docs/STATUS.md #18) |
| `specs/2026-06-13-fase-2-remaining-modules-editorial-design.md` | spec | 2026-06-13 | **BAŞKA PROJE** | 'ItalyPath iOS' Faz 2; bu repoda uygulanmaz, 'remake' mobil projesi kapsamı |
| `specs/2026-06-15-detay-yakinda-rozet-design.md` | spec | 2026-06-15 | **UYGULANDI** | f804ef0, 0368dea, 73749dd (2026-06-15). 19 Eylül 2026'dan beri dosyasız program yok; rozet fiilen görünmez (ComingSoonNotice.tsx duruyor) |
| `specs/2026-06-16-auth-redesign-design.md` | spec | 2026-06-16 | **YERİNE GEÇTİ** | Uygulandı 2026-06-16/17 (867f0a7 vd.); 2026-07-01 Clerk Elements rebuild ile yenilendi. Güncel: specs/2026-07-01-clerk-elements-auth-rebuild-design.md |
| `specs/2026-06-19-link-campus-program-details-import-design.md` | spec | 2026-06-19 | **UYGULANDI** | Plan 12/12; scripts/import-link-campus-program-details.mjs; 72b6cac (2026-06-21) |
| `specs/2026-06-21-seo-server-html-design.md` | spec | 2026-06-21 | **UYGULANDI** | 836592e 'SEO 2' + b3277b6 (2026-06-22) |
| `specs/2026-06-24-siena-program-details-import-design.md` | spec | 2026-06-24 | **UYGULANDI** | 2026-06-24 serisi (ce80b86, f759dd2, a123e70); scripts/import-siena-program-details.mjs. Plan checkbox'ları işaretlenmemiş olsa da iş yapıldı |
| `specs/2026-06-27-auth-production-redirect-hardening-design.md` | spec | 2026-06-27 | **UYGULANDI** | 232e973 (2026-06-27); guard: npm run check:auth-production |
| `specs/2026-07-01-clerk-elements-auth-rebuild-design.md` | spec | 2026-07-01 | **UYGULANDI** | 2026-07-01 (ec35e2f, e100252, 0c900db); auth için esas referans |
| `specs/2026-07-02-hub-onboarding-design.md` | spec | 2026-07-02 | **UYGULANDI** | 5540605 (2026-07-02) |
| `specs/2026-07-03-sat-soru-bankasi-design.md` | spec | 2026-07-03 | **KISMEN** | Math bankası canlı: 1.019 soru (2026-07-03/04 serisi, 3a5e5ea → e6c5475). Reading/Writing (589 soru hedefi) bankaya alınmadı |
| `specs/2026-07-04-sat-kaldigin-yerden-devam-design.md` | spec | 2026-07-04 | **UYGULANDI** | 820cfe1 (2026-07-04) |
| `specs/2026-07-05-sat-calisma-panosu-design.md` | spec | 2026-07-05 | **UYGULANDI** | 55ab43d (2026-07-05) |
| `specs/2026-07-05-sat-konu-organizasyon-zorluk-design.md` | spec | 2026-07-05 | **UYGULANDI** | 4421a21 (2026-07-05) |
| `specs/2026-07-05-sat-seviye-rozet-design.md` | spec | 2026-07-05 | **UYGULANDI** | 4c65f50 (2026-07-05) |
| `specs/2026-07-19-cities-mobile-selector-design.md` | spec | 2026-07-19 | **UYGULANDI** | Kod kanıtı: components/cities/CityGuidesExplorer.tsx 'Mobile City Selector' (select#mobile-city-selector); ayrı commit bulunamadı |
| `specs/2026-07-20-volunteer-mentor-desk-design.md` | spec | 2026-07-20 | **UYGULANDI** | 2e711fc (2026-07-20), PR #3 dc737da (2026-07-21) |
| `specs/2026-07-24-sat-english-rationale-extraction-design.md` | spec | 2026-07-24 | **UYGULANDI** | e9840dd + dbbacbd (2026-08-22); canlı: 1.019/1.019 soruda explanation_en (2026-09-21 sayımı) |
| `specs/2026-08-10-expert-lead-desk-design.md` | spec | 2026-08-10 | **UYGULANDI** | 84e40df (2026-08-11) |
| `specs/2026-08-19-city-guide-content-expansion-design.md` | spec | 2026-08-19 | **UYGULANDI** | 2026-08-21 serisi (60c207b → cc93f8c); 25 araştırılmış + 17 legacy kayıt |
| `specs/2026-08-28-sat-question-remediation-design.md` | spec | 2026-08-28 | **YERİNE GEÇTİ** | Geniş spec; bilinçli olarak dar plan uygulandı: plans/2026-08-28-sat-question-remediation-slim-plan.md (tamamlandı 2026-08-29, 81efb17) |
| `specs/2026-09-15-homepage-free-consultation-design.md` | spec | 2026-09-15 | **UYGULANDI** | 218b2a5 + 2848933 (2026-09-15) |
| `specs/2026-09-15-university-data-egress-isr-design.md` | spec | 2026-09-15 | **UYGULANDI** | SEO_AUDIT §20; canlı doğrulama 2026-09-16 (b9138dc kaydı) |
| `specs/2026-09-16-internal-linking-phase1-design.md` | spec | 2026-09-16 | **UYGULANDI** | 4c112cf (2026-09-16); SEO_AUDIT §22 |
| `specs/2026-09-17-isee-parificato-calculator-design.md` | spec | 2026-09-17 | **UYGULANDI** | 193a242 (2026-09-19) |
| `specs/2026-09-17-program-detail-pages-design.md` | spec | 2026-09-17 | **KISMEN** | Task 1-5 ve 7-9 uygulandı (Deploy 1-4, 17-21 Eylül; SEO_AUDIT §23); Task 6 İPTAL (Kerem, 21 Eylül); kapsam dışı listesi §23.3 |
| `specs/extraction-prompt-template.md` | spec | — | **LEGACY** | İptal edilen deadline scrape hattının parçası; güncel veri girişi yolu değil |
| `specs/sat-math-extraction-prompt.md` | spec | — | **AKTİF REFERANS** | SAT pipeline LLM extract runbook'u (201464f, 2026-07-03); AGENT_CONTEXT 'SAT Soru Bankasi' bölümü |
| `plans/2026-05-10-italypath-editorial-ui.md` | plan | 2026-05-10 | **UYGULANDI** | 5eab41f (2026-05-10) |
| `plans/2026-05-12-universities-field-guide-redesign.md` | plan | 2026-05-12 | **UYGULANDI** | ad109fc (2026-05-12) |
| `plans/2026-05-14-communities-editorial-atlas.md` | plan | 2026-05-14 | **UYGULANDI** | 6055c7a (2026-05-14) |
| `plans/2026-05-14-scholarships-editorial-atlas.md` | plan | 2026-05-14 | **UYGULANDI** | 2026-05-14 serisi; kod: components/scholarships/ScholarshipsExplorer.tsx |
| `plans/2026-05-15-mentor-consultation-desks.md` | plan | 2026-05-15 | **UYGULANDI** | Sonraki değişiklikler için specs/2026-05-15 satırına bak (AI masası 2026-07-23'ten beri paused) |
| `plans/2026-05-18-hub-redesign-plan.md` | plan | 2026-05-18 | **YERİNE GEÇTİ** | 2026-07-02 hub onboarding (5540605) ile kaldırıldı |
| `plans/2026-05-19-home-wiring-auto-advance-plan.md` | plan | 2026-05-19 | **YERİNE GEÇTİ** | Uygulandı 2026-05-20; stage modeli 2026-07-02'de kaldırıldı (5522606) |
| `plans/2026-05-22-university-campus-portrait-details.md` | plan | 2026-05-22 | **UYGULANDI** | 7ace805 + 1e1ca11 (2026-05-22) |
| `plans/2026-05-28-program-deadline-scraping-plan.md` | plan | 2026-05-28 | **İPTAL** | Task 12'de durduruldu (Haziran 2026); deadline altyapısı 2026-07-22'de kaldırıldı |
| `plans/2026-06-01-belge-cuzdani-redesign-plan.md` | plan | 2026-06-01 | **UYGULANDI** | 78661a5 + e481668 (2026-06-02) |
| `plans/2026-06-02-bologna-program-admission-details-plan.md` | plan | 2026-06-02 | **UYGULANDI** | 2026-06-02 (41c3b9c) |
| `plans/2026-06-12-home-schools-editorial-redesign-plan.md` | plan | 2026-06-12 | **BAŞKA PROJE** | iOS pilotu; bu repoda uygulanmaz |
| `plans/2026-06-13-fase-2-remaining-modules-editorial-plan.md` | plan | 2026-06-13 | **BAŞKA PROJE** | iOS Faz 2; bu repoda uygulanmaz |
| `plans/2026-06-15-detay-yakinda-rozet.md` | plan | 2026-06-15 | **UYGULANDI** | f804ef0 (2026-06-15) |
| `plans/2026-06-16-auth-redesign-plan.md` | plan | 2026-06-16 | **YERİNE GEÇTİ** | 2026-07-01 Clerk Elements rebuild planı ile yenilendi |
| `plans/2026-06-19-link-campus-program-details-import.md` | plan | 2026-06-19 | **UYGULANDI** | 12/12 checkbox; 72b6cac (2026-06-21) |
| `plans/2026-06-21-seo-server-html-plan.md` | plan | 2026-06-21 | **UYGULANDI** | 836592e 'SEO 2' (2026-06-22) |
| `plans/2026-06-24-siena-program-details-import.md` | plan | 2026-06-24 | **UYGULANDI** | 2026-06-24 serisi (ce80b86, f759dd2, a123e70); checkbox'lar işaretlenmemiş |
| `plans/2026-06-27-auth-production-redirect-hardening.md` | plan | 2026-06-27 | **UYGULANDI** | 232e973 (2026-06-27) |
| `plans/2026-07-01-clerk-elements-auth-rebuild.md` | plan | 2026-07-01 | **UYGULANDI** | 2026-07-01 (ec35e2f, e100252, 0c900db) |
| `plans/2026-07-02-hub-onboarding-plan.md` | plan | 2026-07-02 | **UYGULANDI** | 5540605 (2026-07-02) |
| `plans/2026-07-03-sat-soru-bankasi-plan.md` | plan | 2026-07-03 | **KISMEN** | Math bankası canlı (1.019 soru); Reading/Writing bankaya alınmadı |
| `plans/2026-07-19-cities-mobile-selector.md` | plan | 2026-07-19 | **UYGULANDI** | Kod kanıtı: CityGuidesExplorer.tsx mobil seçici |
| `plans/2026-07-20-volunteer-mentor-desk-plan.md` | plan | 2026-07-20 | **UYGULANDI** | PR #3 dc737da (2026-07-21) |
| `plans/2026-07-24-sat-english-rationale-extraction.md` | plan | 2026-07-24 | **UYGULANDI** | e9840dd + dbbacbd (2026-08-22) |
| `plans/2026-08-10-expert-lead-desk.md` | plan | 2026-08-10 | **UYGULANDI** | 84e40df (2026-08-11) |
| `plans/2026-08-21-city-guide-content-expansion-plan.md` | plan | 2026-08-21 | **UYGULANDI** | 2026-08-21 serisi (60c207b → cc93f8c) |
| `plans/2026-08-21-sat-authored-explanations-import.md` | plan | 2026-08-21 | **UYGULANDI** | dbbacbd (2026-08-22); canlı 1.019/1.019 explanation_en |
| `plans/2026-08-28-sat-question-remediation-slim-plan.md` | plan | 2026-08-28 | **UYGULANDI** | Tamamlandı 2026-08-29 (81efb17); figür onarım backlog'u 2 kayıt açık (docs/STATUS.md #22) |
| `plans/2026-09-15-homepage-free-consultation-plan.md` | plan | 2026-09-15 | **UYGULANDI** | 218b2a5 + 2848933 (2026-09-15) |
| `plans/2026-09-15-university-data-egress-isr-plan.md` | plan | 2026-09-15 | **UYGULANDI** | SEO_AUDIT §20 (2026-09-16) |
| `plans/2026-09-17-isee-parificato-calculator-plan.md` | plan | 2026-09-17 | **UYGULANDI** | 193a242 (2026-09-19) |
| `plans/2026-09-17-program-detail-pages-plan.md` | plan | 2026-09-17 | **KISMEN** | Task 1-5 ve 7-9 uygulandı, Task 6 İPTAL; görev tablosu dosyanın başında; SEO_AUDIT §23 |
