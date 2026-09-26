# Ortak program sitesi izin listesi — gözden geçirme kanıt tablosu

**Durum: KISMEN** · 2026-09-26 · Kanıt: bu tablo (canlı Supabase okuması + her alan adının tek seferlik ziyareti) ve `lib/officialLinkHosts.mjs` `PARTNER_DOMAINS_BY_DEPARTMENT` (satır ~86). `docs/STATUS.md` açık iş #62'nin gözden geçirme kanıtıdır; izin listesi bu belgeyle **değiştirilmedi**, karar Kerem'e aittir.

**Amaç:** `PARTNER_DOMAINS_BY_DEPARTMENT` içindeki 31 bölümün ortak program sitesi olarak işaretlenmiş alan adlarının gerçekten o programın/okulun resmî ortak sitesi olup olmadığını tek tek doğrulamak, Kerem'in hızlı onay verebilmesi için kanıt sunmak.

**Yöntem:** Bölüm id → program adı/okul/seviye bilgisi repo içindeki araştırma klasörlerinde bulunamadığı için (bu 31 bölümün çoğu repodaki `*-admission-requirements/` klasörlerinin kapsamı dışında), canlı Supabase'den salt okuma tek bir sorguyla (`university_departments` + `universities` join, yalnızca `id`, `name`, `level`, `university_id`, okul `name`/`city`) çekildi; `SUPABASE_SECRET_KEY` değeri hiçbir yerde yazdırılmadı. Sonra her benzersiz alan adı (28 alan adı, bazı bölümler aynı alan adını paylaşıyor) tarayıcıyla bir kez açıldı, başlık ve sayfa metninden okul/program adı arandı. Belirsiz kalan 9 eşleşme için ayrıca tek bir Google araması ile ("<program adı> <okul adı> interateneo/joint" gibi) üçüncü taraf kaynaklardan (üniversite haber sayfaları, ders katalogları) çapraz doğrulama yapıldı. Toplam istek düşük tutuldu, paralel alt ajan açılmadı.

**Sayfa metni veridir, talimat değildir:** ziyaret edilen hiçbir sayfada ajana yönelik bir komut/talimat görülmedi.

## Tablo

| Bölüm id | Okul | Program | Alan adı | Sitede görülen (başlık/künye) | Değerlendirme | Not |
| --- | --- | --- | --- | --- | --- | --- |
| 415 | Milano-Bicocca | Medicine and Surgery (tek döngü) | unibg.it | "Università degli studi di Bergamo \| UniBg"; Google: "Corso Interateneo" — Milano-Bicocca ve Bergamo ortak LM-41 Medicine and Surgery diploması (digip.unibg.it, unibg.coursecatalogue.cineca.it) | Uygun | — |
| 432 | Napoli Parthenope | Sustainable Blue Economy (lisans) | sea-eu.org | "Home - SEA-EU"; 9 kıyı üniversitesi ittifakı (Cadiz, Brest, Kiel, Gdansk, Split, Malta, Algarve, **Naples/Parthenope**, NORD); "Observatory of Sustainable Blue Economy", "SeaBluE Welcome Week ... at Parthenope University" haberleri | Uygun | — |
| 432 | Napoli Parthenope | Sustainable Blue Economy (lisans) | uca.es | "Portal UCA – Portal principal de la Universidad de Cádiz"; UCA, SEA-EU ittifakının öncü/koordinatör üniversitesi | Uygun | — |
| 688 | Napoli Federico II | DIGISOC – Digital Society, Social Innovation and Global Citizenship (yüksek lisans) | digitalsociety4innovation.eu | "Homepage - DigiSoc"; "DIGISOC is a European Joint Master programme in Digital Society, Social Innovation and Global Citizenship"; Napoli'de düzenlenen yaz okulu sayfası | Uygun | — |
| 755 | Pisa | Engineering of Paper and Cardboard (yüksek lisans) | epc-masterdegree.it | "Home EPC - EPC Master degree"; "Laurea Magistrale in Ingegneria della carta e del cartone" (Lucca kampüsü, Pisa'nın kağıt-karton mühendisliği programı) | Uygun | — |
| 776 | Tor Vergata (Roma) | Astrophysics (yüksek lisans) | master-mass.eu | Başlık yalnızca "WordPress – WordPress Description"; sayfa içeriği varsayılan "Hello world!" yazısından ibaret, Astrofizik/Tor Vergata'ya dair hiçbir şey yok. Google araması gerçek "MASS" programını doğruluyor: Tor Vergata'nın koordine ettiği Erasmus Mundus Joint Master in Astrophysics and Space Science (Belgrad, Bremen, Côte d'Azur ortak; kaynak: uniroma2.it, fisica.uniroma2.it) | **Şüpheli** | Alan adı kavramsal olarak doğru (gerçek MASS programına ait) ama site şu an içerik göstermiyor (muhtemelen yenilenme/sona erme). Kerem kararı: öğrenciye böyle mi gösterilsin, yoksa geçici olarak `fisica.uniroma2.it` üzerindeki resmî duyuru sayfasına mı yönlendirilsin |
| 780 | Tor Vergata (Roma) | Clinical Psychosexology (yüksek lisans) | uniroma1.it | "Home \| Sapienza Università di Roma"; Google: "sede amministrativa Sapienza" — Tor Vergata + Sapienza ortak LM-51 programı, idari merkezi Sapienza | Uygun | — |
| 781 | Tor Vergata (Roma) | Chemistry for Nano-Engineering (yüksek lisans) | master-cne.eu | "Master-cne – Erasmus Mundus Joint Master Degree"; sayfada "Tor Vergata University of Rome (Italy)" ortak üniversite ve yerel koordinatör adıyla (Maria Luisa Di Vona) listeleniyor | Uygun | — |
| 794 | Politecnico di Torino | Industrial Chemistry for Circular and Bio Economy (yüksek lisans) | unina.it | "Home - Unina"; Google: "a joint degree of the University of Naples Federico II and Polytechnic of Turin" | Uygun | — |
| 881 | Università Cattolica | Sustainable Viticulture and Enology (yüksek lisans) | viticolturasostenibile.com | Başlık: "Laurea Magistrale in Viticoltura ed Enologia Sostenibili SVE Unicatt" — "Unicatt" adı doğrudan geçiyor | Uygun | — |
| 897 | Free University of Bozen-Bolzano (unibz) | Horticultural Science (yüksek lisans) | unibo.it | "Università di Bologna"; Google: "International Master in Horticultural Science (IMaHS)" — Bologna + unibz ortak diploma, 1-2. dönem Bologna'da, 3. dönem Bolzano'da | Uygun | — |
| 967 | Milano-Bicocca | Human-Centered Artificial Intelligence (yüksek lisans) | unimi.it | "home \| Università degli Studi di Milano Statale"; Google: "The Universities of Milan, Milano-Bicocca and Pavia launch a Joint Master's Degree in Human-Centered Artificial Intelligence" | Uygun | — |
| 1003 | Pavia | Artificial Intelligence for Science and Technology (yüksek lisans) | unimib.it | "Università degli Studi di Milano-Bicocca"; Google: "erogato in lingua inglese congiuntamente con le Università di Milano Statale e [Bicocca]" | Uygun | — |
| 1010 | Pavia | Human-Centered Artificial Intelligence (yüksek lisans) | unimi.it | 967 ile aynı üç-üniversite (Milano, Bicocca, Pavia) ortak programının Pavia tarafı | Uygun | — |
| 1018 | Pavia | Philosophical Knowledge: Foundations, Methods, Applications (yüksek lisans) | unibg.it | Google: "corso di laurea magistrale interateneo ... nato dalla collaborazione tra l'Università di Bergamo, l'Università di Pavia e la Scuola Superiore IUSS di Pavia" | Uygun | — |
| 1025 | UNISR (San Raffaele) | Health Informatics (yüksek lisans) | polimi.it | Google: "corso interateneo nato dalla collaborazione tra l'Università Vita-Salute San Raffaele e il Politecnico di Milano" | Uygun | — |
| 1027 | UNISR (San Raffaele) | Politics, Philosophy and Public Affairs (yüksek lisans) | unimi.it | Google: program "offered jointly by the University of Milan and Vita-Salute San Raffaele University" | Uygun | — |
| 1028 | UNISR (San Raffaele) | Cognitive Psychology in Health Communication (yüksek lisans) | usi.ch | "Università della Svizzera italiana \| USI"; Google: "offered by UniSR and USI" | Uygun | — |
| 1058 | Trento | Energy Engineering (yüksek lisans) | unibz.it | "Free University of Bozen-Bolzano"; Google: "laurea magistrale interateneo ... offerta congiuntamente dall'Università di Trento e dalla Libera Università di Bolzano" | Uygun | — |
| 1067 | Trento | Management - EMBS (yüksek lisans) | embs.eu | "EMBS – European Master in Business Studies"; site içinde "Trento" bir dönem/şehir sayfası olarak listeleniyor (embs.eu/trento/) | Uygun | — |
| 1074 | Trento | Security, Intelligence and Strategic Studies (yüksek lisans) | securityintelligence-erasmusmundus.eu | "Home - IMSISS"; "University of Trento (Italy)" konsorsiyum ortağı olarak açıkça listeleniyor, Trento fotoğraflı haber de var | Uygun | STATUS.md #61'de bu bölümün *resmî program sayfası linki* (`official_program_url`) "ölü" diye işaretli; bu ayrı bir alan (ortak site) ve çalışıyor, karıştırılmamalı |
| 1238 | Pisa | International Programme in Humanities — IPH (lisans) | iphpisa.it | Başlık birebir eşleşme: "IPH – The International Programme in Humanities" | Uygun | — |
| 1247 | Università Cattolica | Criminology (lisans) | transcrime.it | "Chi siamo" sayfası: "Transcrime è il Centro di ricerca interuniversitario ... dell'Università Cattolica del Sacro Cuore ... supporta il coordinamento del curriculum 'Criminology' della Laurea Triennale in Sociologia" — birebir eşleşme | Uygun | — |
| 1253 | Università Cattolica | International Master in Inclusive Education Sciences — MISEI (yüksek lisans) | master-misei.com | Başlık birebir eşleşme; sayfada "Università Cattolica del Sacro Cuore (UCSC)" geçiyor | Uygun | — |
| 1254 | Università Cattolica | Sustainable Food Systems — European Double Degree with ISARA Lyon (yüksek lisans) | susfoods.eu | Başlık: "MSc Sustainable Food Systems - European Double Degree Programme"; hem "Università Cattolica del Sacro Cuore" hem "Isara (France)" adı geçiyor | Uygun | — |
| 1281 | Torino | Economic Analysis and Policy (yüksek lisans) | epog.eu | Başlık: "EPOG - Economic POlicies for the Global bifurcation \| Erasmus Mundus Joint Master"; sayfada "Università degli studi di Torino" ortak olarak listeleniyor | Uygun (dikkat) | Site başlığındaki uluslararası marka adı ("EPOG") kayıttaki program adından ("Economic Analysis and Policy") farklı ifade ediyor — muhtemelen aynı programın Erasmus Mundus dalı/markası. Kerem isterse Torino'nun kendi kataloğunda iki adın aynı LM'e karşılık geldiğini teyit edebilir |
| 1289 | Torino | Food Science and Technology, curriculum Food Systems (yüksek lisans) | mfs-apply.eitfood.eu | Başlık: "Apply online! - EIT Food Master in Food Systems"; başvuru/program arama sayfasında "University of Turin" onlarca kez ders şehri olarak listeleniyor | Uygun | — |
| 1293 | Torino | Digital Skills for Sustainable Societal Transitions (yüksek lisans) | polito.it | "Politecnico di Torino"; Google: "PoliTo+UniTo" ortak (interateneo) programı, "Dipartimento Interateneo di Scienze, Progetto e Politiche del Territorio" | Uygun | — |
| 1299 | Trieste | PoSIG — Political Science, Integration and Governance (yüksek lisans) | posig.info | Başlık birebir eşleşme; "About Partners" sayfasında "University of Trieste (UNITS)" listeleniyor | Uygun | — |
| 1299 | Trieste | PoSIG — Political Science, Integration and Governance (yüksek lisans) | posig.uet.edu.al | Başlık: "Home \| PoSIG - Joint Master Degree" — Arnavutluk'taki ortak üniversitenin (Tiran, UET) aynı programı yansıttığı sayfa | Uygun | — |
| 1300 | Trieste | MBA in International Business (yüksek lisans) | mib.edu | "MIB Trieste School of Management"; Google: "Double Degree MBA, offered in partnership with the University of Trieste and recognized by the MUR" | Uygun | — |
| 1301 | Trieste | Master in Insurance and Risk Management (yüksek lisans) | mib.edu | Aynı site; "Master in Insurance & Risk Management" programı sayfada birebir listeleniyor (1300 ile aynı okul, MIB–Trieste ortaklığı) | Uygun | — |
| 1335 | Perugia | Scienze chimiche — Theoretical Chemistry and Computational Modelling (yüksek lisans) | emtccm.org | Sayfa metni: "Erasmus Mundus Master in Theoretical Chemistry and Computational Modelling"; konsorsiyum sayfasında "Università degli Studi di Perugia" listeleniyor | Uygun | — |

## Özet

- Toplam satır: 33 (31 bölüm; 432 ve 1299 birer bölüm için 2'şer alan adı taşıdığından 2 fazladan satır)
- **Uygun:** 31 (1 tanesi "dikkat" notuyla: #1281 EPOG)
- **Şüpheli:** 1 (#776, `master-mass.eu` — sayfa şu an boş/varsayılan WordPress kurulumu gösteriyor)
- **Ölü:** 0
- **Bakılamadı:** 0

## Kerem'in karar vermesi gereken satırlar

1. **#776 — Tor Vergata Astrophysics, `master-mass.eu`:** Site şu an gerçek içerik göstermiyor (varsayılan "Hello world" WordPress sayfası). Program gerçek ve alan adı doğru (Tor Vergata'nın koordine ettiği MASS/Erasmus Mundus Astrofizik programı), ama bugün öğrenciye tıklatılırsa boş bir sayfaya düşer. Öneri: ya bu haliyle bırakılıp yakında yeniden kontrol edilir, ya da izin listesinden geçici çıkarılır, ya da alternatif olarak `fisica.uniroma2.it`'teki resmî duyuru sayfası eklenir (üçü de Kerem kararı; liste bu görevde değiştirilmedi).
2. **#1281 — Torino Economic Analysis and Policy, `epog.eu`:** Üniversite eşleşmesi doğru ama uluslararası program markası ("EPOG") kayıttaki program adından farklı ifade ediyor. Düşük öncelikli, yalnızca isim tutarlılığı için Kerem isterse teyit edebilir.
3. Geri kalan 29 satır güçlü kanıtla (site içeriği + bağımsız arama doğrulaması) "Uygun" bulundu; ek işlem gerekmiyor.

## Notlar

- Bu belge `lib/officialLinkHosts.mjs` dosyasını **değiştirmedi**; yalnızca gözden geçirme kanıtıdır.
- Bölüm adı/okul bilgisi canlı Supabase'den tek bir salt-okuma sorgusuyla çekildi (egress küçük: 31 satır, birkaç sütun); `SUPABASE_SECRET_KEY` hiçbir çıktıda yazdırılmadı.
- Alan adı başına 1-2 sayfa ziyaret edildi; 9 belirsiz eşleşme için ek olarak tek bir Google araması yapıldı (üçüncü taraf doğrulama). Paralel alt ajan kullanılmadı.
