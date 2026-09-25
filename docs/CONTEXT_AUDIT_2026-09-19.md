# ItalyPath context ve bilgi dosyaları değerlendirmesi

Tarih: 19 Eylül 2026  
İncelenen checkout: `main`, `c63db78`  
Tür: Tarihli değerlendirme; mimari veya çalışma talimatlarının yerine geçmez.  
Uygulama durumu: Öneriler uygulanmadı. Bu rapor dışında proje dosyaları değiştirilmedi.

## Karar

`AGENT_CONTEXT.md` değerli ve büyük ölçüde doğru bir teknik hafıza. Özellikle Supabase/legacy seed ayrımı, hafif dizin ve hedefli sorgu sözleşmesi, Clerk token ayrımı, SAT güvenlik kuralları, ISEE Parificato kapsamı ve tasarım sınırları korunmalı. Stack tablosundaki belirtilen paket sürümleri mevcut lockfile ile uyumlu; sırf belgeyi yenilemek için teknoloji değişikliği gerekmiyor.

Ancak dosya yeni bir ajanın tek başına güvenebileceği güncel başlangıç rehberi olmaya henüz uygun değil. Güncel mimari, eski uygulama adımları, üretim ölçümleri ve yapılacak işler aynı metinde birikmiş. Sorun bilgi eksikliğinden çok, hangi bilginin bugün geçerli olduğunun anlaşılmaması.

Öneri: Önce çelişkileri gider; sonra ana context'i yaklaşık 200–300 satırlık bir başlangıç rehberine indir. Ayrıntıları konu bazlı referanslara, ölçümleri tarihli kayıtlara taşı. Eski belgeleri silmek yerine durumlarını açıkça işaretle.

## Kapsam ve kanıt sınırı

- Kök context, README, değişiklik günlüğü, veri rehberi, güvenlik runbook'u ve iki ana audit belgesi; sosyal medya/AI arama belgeleri, `public/llms.txt`, `.env.example` ve ilgili kod incelendi.
- `docs/superpowers` altında **74 Markdown belge, 51.216 satır, yaklaşık 2,06 MB** var. Tam envanter ve durum/referans taraması yapıldı; güncel mimariyle ilişkili ve çelişkili bölümler ayrıntılı okundu. Tarihsel planlardaki bütün gömülü uygulama kodlarının satır satır yeniden denetlendiği iddia edilmiyor.
- Araştırma klasörlerinde 84 `outline.yaml`/`fields.yaml` dosyası bulundu; bunlar kapsam/kaynak politikası ve tarih açısından tarandı. Her programın araştırma JSON'u veya resmî üniversite kaynağı yeniden doğrulanmadı.
- `output` altındaki sosyal içerik açıklamaları ve HyperFrames proje rehberleri, üretilmiş içeriğe özgü kayıtlar olarak incelendi. Skill paketleri, bağımlılıklar ve eski worktree kopyaları ana projenin güncel context'i sayılmadı.
- Dokuz mevcut yerel kontrol çalıştırıldı. Ayrıca `/llms.txt` için kurulu Next/Clerk eşleştirme fonksiyonlarıyla yerel erişim kontrolü yapıldı.
- Canlı Supabase/GSC/Vercel dashboard durumu bu incelemede doğrulanmadı. Web aracının canlı `sitemap.xml` ve `llms.txt` istekleri erişim sonucu veremedi; bundan production arızası sonucu çıkarılmadı. Rapordaki eski canlı sayımlar yalnız tarihli kanıt olarak değerlendirilir.
- Başlangıçta mevcut olan `docs/SOCIAL_MEDIA.md` değişikliği, prototipler, `content/` ve `dosyasiz-108-program-research/` çalışmaları korundu.

## Öncelikli bulgular

### 1. Erişim modeli kendi içinde çelişiyor — yüksek öncelik

`AGENT_CONTEXT.md:11` ve proje ağacındaki `:58`, mentor yüzeyini giriş gerektiren/protected olarak anlatıyor. Aynı belgenin route matrisi ve mentor bölümü public olduğunu söylüyor. `README.md:89` da `/ai-mentor` için protected diyor.

Kod gerçeği: `proxy.ts` `/ai-mentor`, `/api/expert-leads` ve `/on-gorusme` yollarını public kabul ediyor. Gönüllü yazışma giriş gerektiriyor; `/api/chat` korunuyor. `lib/mentor/channels.ts` içinde AI `paused`, gönüllü ve uzman `active`.

**Düzeltme:** Başlangıç açıklaması, ağaç ve README aynı modeli anlatmalı. AI backend'inin mevcut olması ile AI masasının kullanıcıya açık olması birbirinden ayrılmalı. Route matrisi için tek referans tutulmalı.

### 2. 17–19 Eylül program değişiklikleri context'e eksik yansımış — yüksek öncelik

Şu parçalar kodda var, fakat ana context'in güncel mimari anlatımında yeterince görünmüyor:

- `lib/programMetadata.ts`: Türkçe program metadata üretimi; `check:program-metadata`.
- `ProgramSummaryStrip.tsx`, `ProgramSourceTrail.tsx`, `programDossierShared.tsx`: kabul dosyasının ayrıştırılmış sunumu.
- Program `page.tsx` içindeki `pruneUniversityForProgram`: yalnız açık programın ağır kabul dosyası client'a gönderiliyor.
- `Department.degreeClassCodes`, `programAdmissionPresentation.ts` içindeki `extractDegreeClassCodes` ve `lib/relatedLinks.ts` üzerinden aynı resmî sınıf koduyla program eşleştirme.
- `supabase/program_degree_class_codes.sql`: dizinin artık sorguladığı salt okunur view.

Son madde kurulum açısından önemlidir: ana Supabase envanteri/runbook'u bu bağımlılığı belirtmiyor. `getUniversitiesDirectory()` artık üç tabloya ek olarak view'i de okuyor. Boş bir ortamı yalnız ana rehberlerle kuran kişi bu adımı kaçırabilir.

Context'teki `.select("department_id")` anlatımı da kodun `.select("department_id,updated_at")` ve ayrı sınıf kodu sorgusuna göre güncellenmeli. Kullanıcıya gönderilen veri ile server dizinindeki veri ayrı anlatılmalı.

### 3. Tamamlanmış işler ve kalan işler ayırt edilmiyor — yüksek öncelik

`SEO_AUDIT.md` son bölümünde Türkçe program metadata'sı ve aynı alandaki program bağlantıları hâlâ sonraki işler arasında. Bunlar checkout'ta uygulanmış. Dosyanın başındaki özet ise daha ileride çürütülmüş H1/animasyon teşhisini hâlâ öne çıkarıyor. Üstte düzeltme notu olması faydalı, fakat güncel özet eski öncelikleri yeniden üretmemeli.

Öte yandan 17 Eylül program planının **tamamı bitmiş değil**: `ProgramNextSteps.tsx` mevcut değil; program metadata'sında dosyasız kayıtlar için `noindex` yok; sitemap bütün programları ekliyor. Bunlar güncel kod ile tasarım arasındaki farklar; sonradan alınmış bir karar olup olmadığı bu checkout'tan bilinmiyor.

**Düzeltme:** Program planı görev bazında `implemented / pending / deferred / superseded` olmalı. Tarihsel SEO kaydı korunmalı; üstte yalnız bugünkü açık işler ve son ölçüm bağlantıları bulunmalı. Planın tamamını körlemesine “tamamlandı” işaretleme.

### 4. “En geç üç saatte güncellenir” garantisi doğru değil — yüksek öncelik

`AGENT_CONTEXT.md:226` ve SEO notları, importların en geç üç saatte canlıya yansıyacağını söylüyor. Kodda üç saatlik process memo, ayrı ISR ve hata durumunda eski veri sunma davranışı var. Bunlar kesin bir yayın süresi garantisi oluşturmuyor.

ISR süresi dolduğunda sonraki istek eski sayfayı alıp arka planda yenileme başlatabilir. Memo ile ISR zamanları ayrıca ayrışabilir; kaynak hatası eski veriyi daha uzun tutabilir. [Next.js ISR açıklaması](https://nextjs.org/docs/app/guides/incremental-static-regeneration).

**Düzeltme:** “Üç saatlik yenileme aralığı; istek, memo ve başarılı yeniden üretime bağlı, kesin üst sınır yok” olarak yazılmalı. Veri rehberinde import sonrası doğrulama ve gerçekten acil güncelleme yolu ayrıca tanımlanmalı.

### 5. `.env.example` production gereksinimini yanlış anlatıyor — yüksek öncelik

`SUPABASE_SERVICE_ROLE_KEY` örnek değeri `...for-local-admin-scripts-only`. Oysa `lib/sat/questions.server.ts` ve `lib/mentor/expertLeads.server.ts` production server akışında bu anahtarı kullanıyor. README ve runbook daha doğru bilgi veriyor.

**Düzeltme:** “Server-only; SAT okuma, expert lead insert ve yetkili admin scriptleri” olarak açıklanmalı. Anahtar client'a veya `NEXT_PUBLIC_*` alanına taşınmamalı. Local/Preview/Production env gereksinimleri aynı tabloda gösterilmeli.

### 6. Belgelenmiş kontrol bugün çalışmıyor — yüksek öncelik

`npm run check:cities` şu hatayla duruyor:

```text
lib/hub/recommendations.ts requested unsupported runtime import @/lib/admissionPresence.
```

`scripts/check-cities-data.mjs:69` içindeki özel TypeScript yükleyicisi, Hub öneri modülünün yeni bağımlılığını import haritasına eklememiş. Bu sonuç şehir verisinin hatalı olduğunu kanıtlamıyor; kontrolün veriyi doğrulayacak aşamaya ulaşamadığını gösteriyor.

**Düzeltme:** Yükleyici bağımlılığı desteklemeli; sonra test yeniden çalıştırılmalı. Belgelerdeki tarihsel “kontroller yeşil” ifadeleri bugünkü çalışma durumu gibi kullanılmamalı.

### 7. AI arama belgesindeki erişilebilirlik varsayımı korunmuyor — yüksek öncelik

`docs/AI_SEARCH_VISIBILITY_PLAN.md` ve `public/llms.txt`, dosyayı asistanlar için discovery kaynağı olarak tanımlıyor. Yerel route eşleştirme sonucu:

| Yol | Proxy eşleşiyor | Public allowlist |
| --- | --- | --- |
| `/llms.txt` | Evet | Hayır |
| `/robots.txt` | Evet | Evet |
| `/sitemap.xml` | Evet | Evet |

Dolayısıyla mevcut proxy kodu `/llms.txt` isteğini auth korumasına yönlendiriyor. `check:ai-search` geçmesine rağmen yalnız dosya içeriğini, robots dizelerini ve sayacın başlangıcını kontrol ediyor; HTTP/route erişimini kontrol etmiyor. Production yanıtı ayrıca doğrulanmalı.

**Düzeltme:** Public olması amaçlanıyorsa tam `/llms.txt` yolu allowlist ve route testine eklenmeli. İlgisiz bütün `.txt` dosyalarını açmaya gerek yok. Bu bir Google sıralama optimizasyonu değildir; planın mevcut niyetini gerçekleştirmektir. Google'ın güncel rehberi de `llms.txt` dosyasını Google için gerekli görmüyor. [Google Search Central](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

### 8. Ürün verisindeki yaşlanma belge güncelliğinden ayrı ele alınmalı — yüksek öncelik

Repo verisinde:

- Bursların 20 bölge kaydında `lastVerifiedAt = 2026-03-09`; akademik yılı dolu sekiz kayıt `2025/2026`.
- Toplulukların 19 kaydında `lastCheckedAt = 2026-03-10`.
- ISEE referansları `2026/27`, doğrulama etiketi `2026-09-17`.

ISEE ile burs haritasının farklı yılları kullanması ana context'te dürüstçe belirtilmiş; bu iyi. Ancak ayrı kaynakların bakım borcu için tek bir aktif görev, sorumlu ve kontrol tarihi yok. Temmuz editorial audit'i bu borçları içeriyor, fakat aynı listede artık değişmiş şehir/ISEE mimarisini de eleştiriyor.

**Düzeltme:** Yalnız belge tarihini ileri almak yeterli olmaz. Burs ve topluluk verileri kaynaklarından yeniden kontrol edilmeli; eski kayıt tarihleri doğrulama yapılmadan değiştirilmemeli. Bu inceleme resmî mali/hukuki değerleri yeniden onaylamaz.

### 9. Yeni sosyal içerikler de kaynak/kapsam kontrolü istiyor — orta öncelik

`docs/SOCIAL_MEDIA.md`, geçerli hesabı `@eduitalya` ve kreatif marka adını “Eduitalya Italypath” olarak belirtiyor; ana context bunu yönlendirmiyor. Bu, sitenin canonical markasını otomatik değiştirmek için gerekçe değildir; iki kullanımın sınırı belgelenmeli.

`content/instagram/CAPTIONS.md` aynı belgede 1.008 program ve 900 kabul dosyası diyor; buna rağmen “her programın yanına kaynağını koyduk” ve her programın dil şartının yazıldığı gibi kapsayıcı vaatler içeriyor. Sayılar 8 Eylül snapshot'ı olarak etiketlenmiş; bu iyi, fakat tüm programların aynı ayrıntıda doğrulandığını ispatlamaz. “Tüm rakamlar veritabanından” açıklaması da dosyadaki sürümlü maliyet tahminlerini ayrı tanımlamalı.

`output/social-feature-posts/captions.md` içinde `1.400+` ve Math + Reading/Writing iddiaları mevcut. Güncel SAT sayımı yapılmadığı için burada yanlış oldukları sonucuna varılmadı; yayın öncesi canlı kapsamla eşleştirme gerekiyor.

**Düzeltme:** Taslak / onaylı / yayımlandı ayrımı, veri snapshot tarihi ve iddia kaynağı içerik paketinde tutulmalı. `output` altındaki eski kampanyalar aktif yayın rehberi sayılmamalı.

### 10. Arşivler başlangıç rehberi gibi görünüyor — orta öncelik

- `AGENT_CONTEXT_FIX_REPORT.md` 11 Haziran'a ait ve uygulanmış düzeltmeleri içeriyor. Buna rağmen README ve context onu “son audit” diye sunuyor. `TTL=0`, eski auth ve 972 program gibi tarihsel ifadeler bugüne taşınmamalı.
- `AGENT_COMMITS.md` “Bu Chat'te” başlığı ve büyük ölçüde tarihsiz, gerçek commit SHA'sı olmayan sıra numaraları kullanıyor. Yeni ISEE kaydı var; expert lead, egress/ISR ve program yenilemeleri eşit düzeyde işlenmemiş. Eksiksiz changelog kabul edilmemeli.
- 33 uygulama planının 31'inde bütün checkbox'lar boş. Toplam 14 işaretli, 1.427 işaretsiz adım var. Bu sayılar gerçek ilerlemeyi temsil etmiyor.
- Bazı uygulanmış tasarımlarda hâlâ “onay bekliyor” yazıyor. Yeni ajan yeniden onay isteyebilir veya tamamlanmış işi tekrar başlatabilir.
- SAT remediation'ın geniş spec'i ile uygulanmış slim plan arasında bilinçli fark var. Slim plan bunu açıkça söylüyor; geniş spec de en üstte bu istisnaya bağlantı vermeli.

**Düzeltme:** Arşivlerin ilk satırlarına tarih, durum, yerine geçen belge ve uygulama commit'i eklenmeli. Checklist ancak kanıtla güncellenmeli; hepsi topluca tamamlandı sayılmamalı.

### 11. Küçük ama biriken rehber hataları — orta/düşük öncelik

- Context ağacındaki `docs/CAMPAIGN_PLAN_LAUNCH.md`, `docs/LAUNCH_STRATEGY_INSTAGRAM_TIKTOK.md` ve `components/auth/VerificationStep.tsx` yok.
- Auth bölümü güncel Clerk Elements mimarisini anlatırken esas referans olarak 16 Haziran tasarımını veriyor; 1 Temmuz Elements belgeleri daha uygun.
- Tarihsel `getUniversitiesData()` anlatımı güncel mimari dosyasında kalmış. Çözülmüş soğuk veri çekme problemi açık borç listesinde çözüm adaylarıyla tekrar duruyor.
- Supabase ana envanteri SAT tablolarını ve yeni view'i tam kapsamıyor. Runbook legacy/native token ayrımında yararlı, fakat tam sıfırdan kurulum rehberi değil; başlık/kapsam bunu söylemeli.
- `clean:med` genel komut listesinde, fakat ihtiyaç duyduğu kök `med` dosyası yok; ayrıca bu bir doğrulama komutu değil, dosya üreten legacy araç.
- `DATA_ENTRY_GUIDE.md` yalnız 39 satır: hedef ortam, dry-run, yedek, yazılabilir alanlar, kaynak/akademik yıl ve import sonrası cache kontrolü eksik.
- Genel kurulum rehberinde Node sürümü sabitlenmemiş. Bazı eski planların “Supabase Node 22+ ister” iddiası mevcut lockfile'ın `>=20.0.0` gereksinimiyle uyuşmuyor. Aktif kurulumda test edilmiş tek Node sürümü belirtilmeli; eski plana bakarak sürüm gereksinimi çıkarılmamalı.
- Root `AGENTS.md` yok. Projeye özgü kritik kurallar yalnız manuel okunması gereken `AGENT_CONTEXT.md` içinde. Kısa bir giriş dosyası, doğru okuma sırasını görünür kılar.

## Dosya bazında öneri

| Dosya/grup | Karar |
| --- | --- |
| `AGENT_CONTEXT.md` | Korunmalı; çelişkiler temizlenip güncel başlangıç rehberine kısaltılmalı. |
| `README.md` | Kurulum + environment + temel komutlar; route/mimari ayrıntısını tekrar etmemeli. |
| `AGENT_CONTEXT_FIX_REPORT.md` | 11 Haziran tarihli uygulanmış audit olarak arşivlenmeli/etiketlenmeli. |
| `AGENT_COMMITS.md` | Tarihsel, eksik değişiklik notları olarak etiketlenmeli; Git geçmişinin yerine geçmemeli. |
| `DATA_ENTRY_GUIDE.md` | Güncel veri bakım runbook'una genişletilmeli. |
| `SUPABASE_SECURITY_RUNBOOK.md` | Korunmalı; kapsam, SQL bağımlılıkları ve son doğrulama tarihi eklenmeli. |
| `SEO_AUDIT.md` | Ölçüm geçmişi korunmalı; güncel özet ve açık iş listesi ayrılmalı. |
| `EDITORIAL_AUDIT.md` | Temmuz snapshot'ı korunmalı; bugünkü açık maddeler ayrı kayıtla eşlenmeli. |
| `docs/AI_SEARCH_VISIBILITY_PLAN.md` | Ana ilkeler geçerli; erişim testi, güncel ISEE kapsamı ve ölçüm kaydı eklenmeli. |
| `docs/SOCIAL_MEDIA.md`, `content/instagram/` | Aktif marketing bağlamı; draft/yayın durumu ve iddia kaynakları eklenmeli. |
| `scripts/scrape-deadlines-runbook.md`, eski deadline spec/prompt | Legacy pipeline etiketi eklenmeli; Supabase veri girişinin güncel yolu gibi sunulmamalı. |
| `docs/superpowers/{briefs,specs,plans}` | Dosya bazında durum/yerine-geçen/commit alanları; kısmen bitmiş program planı ayrı izlenmeli. |
| Araştırma `outline.yaml` / `fields.yaml` | Araştırma girdisi olarak korunmalı; güncel DB gerçeği sayılmamalı; import kanıtına bağlanmalı. |
| `output/**` rehberleri | Üretilmiş varlığın bağlamı; ana uygulama kurallarından ayrılmalı. |

## Önerilen sade yapı

```text
AGENTS.md                    kısa okuma sırası, değişmez çalışma kuralları
AGENT_CONTEXT.md             güncel ürün ve mimari özeti, ilgili belge bağlantıları
README.md                    kurulum ve geliştirme
DATA_ENTRY_GUIDE.md          veri operasyonu ve doğrulama
SUPABASE_SECURITY_RUNBOOK.md auth/RLS operasyonu
docs/architecture.md        ayrıntılı veri, cache, auth ve feature sözleşmeleri
docs/status.md              yalnız güncel açık işler ve kanıtlanmış son durum
docs/SOCIAL_MEDIA.md         marketing bağlamı
docs/superpowers/...         durum etiketli tasarım ve plan geçmişi
```

İlk adımda dosyaları taşımak zorunlu değil. Mevcut yolları koruyup arşiv etiketleri ve bir index eklemek daha az kırık bağlantı riski taşır. Yaklaşık 200–300 satırlık hedef, katı bir sınır değil; tekrar ve tarihsel anlatımı çıkarma hedefidir.

Yeni belge metadata'sı: `status`, `last_verified_at`, `verified_against` (commit/ortam), `superseded_by`. Tasarım tarihi ile doğrulama tarihi ayrı tutulmalı. Kod mevcut davranışı; tasarım hedefi; canlı ölçüm ise yalnız ölçüldüğü anı anlatır.

Güncel sayıların context'e sürekli kopyalanması yerine tarihli tek snapshot kullanılmalı. Komutlar “offline kontrol / canlı okuma / DB yazma / legacy araç” diye ayrılmalı. Belgelerdeki path ve npm script referansları için hafif bir `check:docs` düşünülebilir; arşivdeki eski yolları hata saymamalı ve canlı veritabanına bağlanmamalı.

## Bu incelemede çalıştırılan kontroller

| Kontrol | Sonuç |
| --- | --- |
| `check:routes` | Geçti |
| `check:university-data-source` | Geçti |
| `check-universities-server-compose.mjs` | Geçti |
| `check:isee` | Geçti |
| `check:cities` | Başarısız — özel test yükleyicisinde eksik import |
| `check:seo-vitals` | Geçti |
| `check:ai-search` | Geçti; `/llms.txt` erişimini kapsamıyor |
| `check:program-metadata` | Geçti |
| `check:admission-dossier` | Geçti |

Ek yerel eşleştirme `/llms.txt` korumasını doğruladı. Production build, tam lint, canlı veri yazımı veya deploy yapılmadı. Bu rapor uygulamanın bütün testlerinin geçtiği anlamına gelmez.

## Uygulama sırası önerisi

1. Context/README auth çelişkisi, environment açıklaması ve yeni program/view bağımlılıklarını düzelt.
2. `check:cities` yükleyicisini ve `/llms.txt` erişim/test boşluğunu ayrı küçük teknik değişiklikler olarak ele al.
3. SEO/program planında tamamlanan ve kalan görevleri kodla eşleştir; eski brief/onay mesajlarını geçersiz kılan durum notlarını ekle.
4. Güncel context'i kısalt; root `AGENTS.md`, belge index'i ve tek açık iş listesi oluştur.
5. Burs/topluluk kaynaklarını ve yayınlanacak sosyal iddiaları ayrı içerik güncelliği işi olarak doğrula.

Bu sıra önce yanlış yönlendirme riskini azaltır; ardından belge bakım yükünü düşürür. Proje mimarisini baştan değiştirmek gerekmiyor.
