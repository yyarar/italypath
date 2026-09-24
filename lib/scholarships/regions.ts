import type { RegionSlug, ScholarshipRegionRecord } from '@/types/scholarships';

const REGISTRY_PENDING_NOTE =
  'Henüz doğrulanmadı (9 Mart 2026 itibarıyla). Başvuru öncesi resmi bandoyu kontrol edin.';

export const SCHOLARSHIP_DEFAULT_REGION: RegionSlug = 'lombardia';

export const SCHOLARSHIP_REGIONS: ScholarshipRegionRecord[] = [
  {
    regionSlug: 'abruzzo',
    regionName: 'Abruzzo',
    managingBodies: [
      { name: "ADSU Chieti-Pescara", officialUrl: 'https://www.adsuchietipescara.it/' },
      { name: "ADSU L'Aquila", officialUrl: 'https://adsuaq.org/' },
      { name: 'ADSU Teramo', officialUrl: 'https://www.adsuteramo.it/' },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.adsuchietipescara.it/',
      'https://adsuaq.org/',
      'https://www.adsuteramo.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'basilicata',
    regionName: 'Basilicata',
    managingBodies: [{ name: 'ARDSU Basilicata', officialUrl: 'https://www.ardsubasilicata.it/' }],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.ardsubasilicata.it/',
      'https://www.regione.basilicata.it/ardsu-bando-borse-di-studio-e-posti-alloggi/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'calabria',
    regionName: 'Calabria',
    managingBodies: [
      {
        name: 'Universita della Calabria - Diritto allo Studio',
        officialUrl: 'https://www.unical.it/',
      },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.unical.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'Henüz doğrulanmadı (9 Mart 2026 itibarıyla). Calabria kaydı bu turda üniversite bazlı resmi kaynakla tutuldu; başvuru öncesi ilgili kurum bandosunu kontrol edin.',
    completeness: 'registry-only',
  },
  {
    regionSlug: 'campania',
    regionName: 'Campania',
    managingBodies: [{ name: 'ADISURC', officialUrl: 'https://www.adisurcampania.it/' }],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      'Bando 24 Temmuz 2026\'da yayımlandı; tüm program türleri (lisans, yüksek lisans, doktora/uzmanlık) için tek son tarih 10 Eylül 2026 saat 12:00 (online başvuru, kesin süre). Tıp, diş hekimliği ve veterinerlik "semestre filtro" öğrencileri 31 Mart 2027\'ye kadar geç başvurabilir. Geçici sıralamalar 31 Ekim 2026\'ya, kesin sıralamalar 31 Aralık 2026\'ya kadar; şekli düzeltme talebi geçici sıralamadan itibaren 14 gün içinde.',
    iseeLimit: '€25.500,00',
    ispeLimit: '€54.000,00',
    benefits: [
      'Burs (nakit; in sede öğrencilere günde bir ücretsiz öğün dahil)',
      'Posto alloggio (yurt; yalnız fuori sede öğrenciler, 14 ADiSURC yurdu)',
      'Uluslararası hareketlilik katkısı (aylık toplam 600 €, en fazla 10 ay, ek yol masrafı)',
      'Ristorazione (indirimli yemekhane)',
      'Bölgesel DSU vergisi ve üniversite harcı iadesi (fon dışı kalan idonei dahil)',
      'Burs tutarı 2026/27 (ISEE ≤ 17.000 €): fuori sede 7.171,11 €, pendolare 4.190,71 €, in sede 2.890,16 €; ISEE 25.500 € sınırında sırasıyla 4.589,28 / 2.396,85 / 1.461,62 €; engel, STEM kadın öğrenci ve çok düşük ISEE için ek artışlar',
    ],
    housingSupport:
      "Yurt talebi aynı online başvuruda işaretlenir; yalnız fuori sede sayılan öğrenciler (ders yeri eve en az 30 km uzakta veya Ischia/Capri/Procida'da ikamet; 1 Ekim 2026–30 Eylül 2027 dönemi için kayıtlı kira sözleşmesi ya da yurt yeri) başvurabilir. Yerleştirme sıralamaya ve kontenjana göre yapılır, hak değildir.",
    canteenSupport:
      'Yemekhane hizmeti 1 Kasım 2026–31 Ekim 2027 döneminde ADiSURC yemek birimlerinde verilir. Pendolare ve fuori sede bursiyerlerde yemekhane kullanımı burstan zorunlu kesinti doğurur: yılda 810 € (günde bir öğün) veya 1.521 € (iki öğün).',
    internationalStudentNotes:
      'Ailesi yurt dışında yaşayan öğrenciler için ISEE Universitario Parificato (ISEEUP) bir CAF\'ta düzenlenir ve en geç 31 Mart 2027\'de ADiSURC\'a ulaşmalıdır; istenirse aile bileşimi, 2024 gelir ve 31.12.2024 mal varlığı belgeleri İtalyanca çeviri ve konsolosluk onayıyla sunulur. MUR "özellikle yoksul ülke" listesindeki ülkelerden gelenler için konsolosluk belgesi kuralı ayrıdır; mülteci ve vatansız öğrenciler İtalya\'da yaşayan aile gibi normal ISEE ile değerlendirilir.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.adisurcampania.it/notizie/approvazione-bando-di-concorso-20262027',
      'https://www.adisurcampania.it/sites/default/files/2026-07/Bando%20di%20Concorso%20a.a.%202026.27.pdf',
      'https://www.adisurcampania.it/',
    ],
    lastVerifiedAt: '2026-09-23',
    statusNote:
      "ADiSURC 2026/2027 resmi bandosu (24 Temmuz 2026) ve duyuru sayfası üzerinden doğrulandı (23 Eylül 2026); ana başvuru dönemi 10 Eylül 2026'da kapandı.",
    completeness: 'verified-full',
  },
  {
    regionSlug: 'emilia-romagna',
    regionName: 'Emilia-Romagna',
    managingBodies: [{ name: 'ER.GO', officialUrl: 'https://www.er-go.it/' }],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      'Burs başvurusu 23 Haziran–24 Ağustos 2026 saat 16:00 (tüm yıllar ve program türleri; geç başvuru kabul edilmez). Yurt için ayrı takvim (bando "Scadenze" tablosu). Yan destekler için pencereler: eğitim çekleri 15 Eylül–10 Aralık 2026, ikamet beyanı 3 Kasım 2026\'ya kadar, olağanüstü katkılar 1 Ekim–1 Aralık 2026, engelli öğrenci katkıları 20 Ocak–8 Mart 2027.',
    iseeLimit: '€25.000,00',
    ispeLimit: '€50.000,00',
    benefits: [
      'Borsa di studio (nakit; istenirse bir kısmı yemekhane kredisine çevrilir; bölgesel vergi iadesi dahil)',
      'Alloggio (yurt; sıralamalı, anlaşmalı ve serbest erişim katmanları)',
      'Ristorazione (yemekhane kredisi; idoneo olup fon dışı kalanlara 500 € katkı)',
      'Uluslararası hareketlilik katkısı (aylık 600 €, en fazla 10 ay; 200.000 € toplam havuz)',
      'Olağanüstü katkılar, engelli öğrenci destekleri, eğitim çekleri',
      'Burs tutarı 2026/27 (ISEE ≤ 16.666,67 €): fuori sede 7.171,11 €, pendolare 4.190,71 €, in sede 2.890,16 €; en üst bantta (ISEE 20.818,47–25.000 €) 3.585,56 / 2.095,36 / 1.445,08 €',
    ],
    housingSupport:
      "ER.GO yurtları Bologna, Cesena, Ferrara, Forlì, Modena, Parma, Piacenza, Ravenna, Reggio Emilia ve Rimini'de. Sıralamalı erişim, bursla aynı ekonomik (ISEE 25.000 € / ISPE 50.000 €) ve başarı şartlarını taşıyan fuori sede öğrencilere tüm akademik yıl için açıktır; ayrıca anlaşmalı programlar için indirimli erişim ve serbest erişim katmanları vardır. Ücretler yıllık tarife tablosuna göre.",
    canteenSupport:
      "Bursiyerler başvuru sırasında bursun 200, 400, 500 veya 600 €'luk kısmını ön ödemeli yemekhane kredisine çevirebilir (sonradan geri alınamaz). Şartları taşıyıp fon yetersizliğinden burs alamayan idonei öğrencilere 500 €'luk yemekhane katkısı verilir.",
    internationalStudentNotes:
      'Uluslararası öğrenciler 2025 yılı gelir ve mal varlığı belgelerini (ilgili ülke makamından, İtalyanca çevrili ve onaylı; AB dışı öğrenciler için kendi beyanı kabul edilmez) DOSSIER UTENTE üzerinden başvurunun kendi son tarihine kadar yüklemek zorundadır; eksik belge CAF kullanılsa bile uygunluğu düşürür. Belge listesi: aile bileşimi, 2025 çalışma durumu, 2025 brüt gelir, 31.12.2025 gayrimenkul ve menkul varlıklar.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.er-go.it/cosa-fare-per/bandi-di-concorso/leggi-il-bando',
      'https://www.er-go.it/cosa-fare-per/bandi-di-concorso/leggi-il-bando/bando-di-concorso-benefici-dsu-a-a-2026_2027.pdf/@@download/file',
      'https://www.er-go.it/cosa-fare-per/bandi-di-concorso/soglie-economiche-per-laccesso',
      'https://www.er-go.it/cosa-fare-per/bandi-di-concorso/scadenze/copy_of_scadenze-per-richiedere-i-benefici',
    ],
    lastVerifiedAt: '2026-09-23',
    statusNote:
      "ER.GO 2026/2027 bandosu (Sezione I–XI) ile resmi takvim ve eşik sayfaları üzerinden doğrulandı (23 Eylül 2026); ana başvuru 24 Ağustos 2026'da kapandı, bazı yan destek pencereleri açık.",
    completeness: 'verified-full',
  },
  {
    regionSlug: 'friuli-venezia-giulia',
    regionName: 'Friuli Venezia Giulia',
    managingBodies: [{ name: 'ARDiS FVG', officialUrl: 'https://ardis.fvg.it/' }],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://ardis.fvg.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'lazio',
    regionName: 'Lazio',
    managingBodies: [{ name: 'DiSCo Lazio', officialUrl: 'https://laziodisco.it/' }],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      "1. faz: 10 Haziran–22 Temmuz 2026 saat 12:00 (online başvuru); 2. faz (düzeltme penceresi): 30 Temmuz–11 Ağustos 2026 saat 12:00. Geçici sonuçlar 29 Temmuz 2026'ya kadar yayımlandı; yurt kesin sonuçları 16 Eylül 2026'da açıklandı, burs ve hareketlilik kesin sonuçları 12 Ekim 2026'da bekleniyor.",
    iseeLimit: '€28.339,88',
    ispeLimit: '€61.608,48',
    benefits: [
      'Borsa di studio (nakit + günde 2 ücretsiz öğün)',
      'Posto alloggio (yurt; fuori sede) ve ayrı "tariffa agevolata" konut hattı (ISEE 40.000 € / ISPE 86.956,58 € eşiği)',
      'Contributo mobilità internazionale',
      'Premio di laurea',
      'Bölgesel DSU vergisi iadesi (kazananlar ve idonei)',
      "Burs tutarı 2026/27 (ISEE 14.169,94–18.893,25 €): fuori sede 6.571,11 €, pendolare 3.590,71 €, in sede 2.290,16 €; daha düşük ISEE'de %15 artış, üst sınıra doğru kademeli olarak yarıya iner",
    ],
    housingSupport:
      'Olağan yurt yeri yalnız Lazio\'daki bir üniversiteye kayıtlı fuori sede öğrencilere, bursla aynı ISEE/ISPE eşiğiyle verilir; DiSCo yurtları ve anlaşmalı yurtlarda sıralama katsayısına göre yerleştirme yapılır, kontenjanın %25\'i birinci sınıflara ayrılır (en az %20\'si AB dışı uluslararası öğrenciler). "Tariffa agevolata" hattının uygulama kuralları bando yayımında henüz belirlenmemişti.',
    canteenSupport:
      'Bursiyerlere günde 2 ücretsiz öğün (yıllık burs: 11 Ekim 2026–30 Eylül 2027; doktora/uzmanlık: 2027 takvim yılı). Şartları taşıyıp fon dışı kalan idonei öğrencilere günde 1 ücretsiz öğün ve bölgesel vergi muafiyeti.',
    internationalStudentNotes:
      'Ailesi yurt dışında yaşayan öğrenciler DiSCo\'nun anlaşmalı CAF\'larında ISEEUP imzalamak zorundadır; kesin son tarih 10 Aralık 2026. Belgeler (aile bileşimi, 2024 gelirleri, 31.12.2024 gayrimenkul ve menkul varlıklar, kira) ilgili ülkedeki İtalyan konsolosluğunca düzenlenmiş ve İtalyanca çevrilmiş olmalıdır; kendi beyanı kabul edilmez. MUR "özellikle yoksul ülke" listesi için ayrı konsolosluk belgesi kuralı vardır.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://laziodisco.it/bando-diritto-allo-studio-2026-2027/',
      'https://laziodisco.it/wp-content/uploads/2026/07/BANDO-DIRITTO-ALLO-STUDIO-26-27-con-EC.pdf',
      'https://laziodisco.it/bando-diritto-allo-studio-2026-2027/allegati-al-bando-diritto-allo-studio-2026-2027/',
      'https://laziodisco.it/bando-diritto-allo-studio-2026-2027/faq-studenti-internazionali/',
    ],
    lastVerifiedAt: '2026-09-23',
    statusNote:
      'DiSCo Lazio 2026/2027 bandosu (10 Haziran 2026), ekleri ve resmi duyuruları üzerinden doğrulandı (23 Eylül 2026); iki başvuru fazı da kapandı.',
    completeness: 'verified-full',
  },
  {
    regionSlug: 'liguria',
    regionName: 'Liguria',
    managingBodies: [
      {
        name: 'ALiSEO - Agenzia ligure per studenti e orientamento',
        officialUrl: 'https://www.aliseo.liguria.it/',
      },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.aliseo.liguria.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'lombardia',
    regionName: 'Lombardia',
    managingBodies: [
      {
        name: 'Regione Lombardia (DSU kriter ve koordinasyon)',
        officialUrl:
          'https://www.regione.lombardia.it/istruzione-formazione-e-lavoro/universita-e-formazione-accademica/red-diritto-allo-studio-universitario',
      },
      {
        name: 'Universita / AFAM / SSML kurumlari (kurum bazli bando)',
        officialUrl:
          'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      },
    ],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      "Kurum bazlı: Regione Lombardia yalnız ölçütleri ve tutarları belirler (DGR XII/6298, 15 Haziran 2026), 45 kurumun her biri kendi bandosunu açar. Örnekler: Università degli Studi di Milano burs ve yemekhane başvurusu 10 Temmuz–30 Eylül 2026 saat 23:59 (hâlâ açık), yurt başvurusu 7 Ağustos 2026'da kapandı; Politecnico di Milano son tarihleri 21 Temmuz ve 5 Ağustos 2026 (kapandı). Kendi üniversitenin DSU sayfasını kontrol et.",
    iseeLimit: '€26.887,93',
    ispeLimit: '€58.452,06',
    benefits: [
      'Borsa di studio (bölgesel DSU vergisi iadesi dahil; tutar gelir bandı ve in sede / pendolare / fuori sede kategorisine göre)',
      'Posto alloggio / servizio abitativo (kurumun yurdu veya kira sözleşmesi tanınması)',
      'Ristorazione (ücretsiz veya gelir bandına göre indirimli yemekhane; burstan 829 € yemek payı düşülür)',
      'Uluslararası hareketlilik ve staj katkısı (aylık 600 €, en fazla 10 ay, ek yol masrafı)',
      'Premio di laurea (zamanında mezunlar)',
      'Bölgesel DSU vergisi 2026/27: ISEE bandına göre 130 / 160 / 190 € (bursiyerlere iade edilir)',
      'Burs tutarı 2026/27 (toplam değer, yemek ve varsa yurt hizmeti dahil): 1. gelir bandında (ISEE ≤ 13.443,97 €) in sede 3.430 €, pendolare 4.820 €, fuori sede 8.248 €; 3. bantta (ISEE 17.925,30–26.887,93 €) 2.143 / 3.299 / 5.857 €; düşük ISEE, engel ve STEM kadın öğrenci için ek artışlar',
    ],
    housingSupport:
      'Kurum bazlı. Fuori sede sayılmak için Eylül 2026–Eylül 2027 arasında en az 10 ay ücretli konaklama (kayıtlı kira sözleşmesi veya yurt belgesi) gerekir; belge sunulmazsa pendolare tutarı ödenir. Örnek: Milano Üniversitesi ayrı yurt bandosuyla 1.345 yer sunuyor (yıllık en fazla 2.799 €).',
    canteenSupport:
      "Bölge burstan 829 €'luk yemek payı düşer; her kurum hizmeti kendi yöntemiyle (yemekhane, anlaşmalı işletme, kupon) verir. Örnek: Milano Üniversitesi'nde bursiyerler ve idonei 1 Ocak–31 Aralık 2027 arasında yemekhaneyi ücretsiz kullanır.",
    internationalStudentNotes:
      'İki katman vardır: bölge ilkeleri (DGR XII/6298 "studenti stranieri": DPCM 159/2013 md. 8/5; AB dışı öğrenciler için D.Lgs 286/1998; "özellikle yoksul ülke" listesi D.M. 176/2026 ile konsolosluk belgesi) ve her kurumun kendi prosedürü. Ailesi yurt dışında yaşayanlar aile bileşimi, 2025 gelirleri ve 31.12.2025 mal varlığı belgelerini ülke makamlarından, çevrili ve onaylı sunar; kendi beyanı kabul edilmez. Ayrıntı kurumun bandosunda (örnek: Milano Üniversitesi md. 5.4).',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.regione.lombardia.it/istruzione-formazione-e-lavoro/universita-e-formazione-accademica/borse-di-studio-universitarie-2026-2027',
      'https://www.regione.lombardia.it/istruzione-formazione-e-lavoro/universita-e-formazione-accademica/red-diritto-allo-studio-universitario',
      'https://www.regione.lombardia.it/content/dam/rl/canali-tematici-servizi/03-istruzione-formazione-e-lavoro/06-universita-e-formazione-accademica/red-borse-di-studio-universitarie/allegati/DGR%206298%20Criteri%20e%20linee%20di%20finanziamento%20borse%20di%20studio%202026%202027.pdf',
      'https://www.unimi.it/sites/default/files/2026-07/Bando_Borse_regionali%202026-27_IT_1.pdf',
    ],
    lastVerifiedAt: '2026-09-23',
    statusNote:
      "Regione Lombardia 2026/2027 ölçüt kararı (DGR XII/6298) ile Milano Üniversitesi ve Politecnico di Milano'nun 2026/27 bandoları üzerinden doğrulandı (23 Eylül 2026); takvimler kurum bazlıdır.",
    completeness: 'verified-full',
  },
  {
    regionSlug: 'marche',
    regionName: 'Marche',
    managingBodies: [{ name: 'ERDIS Marche', officialUrl: 'https://erdis.it/' }],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      "Tüm program türleri için tek pencere: 14 Temmuz–28 Ağustos 2026 (bando md. 10.1; saat belirtilmemiş). Geçici sıralamalar 18 Eylül 2026'da onaylandı; yurt kazananlar 25 Eylül 2026'ya kadar kabul bildirdi; geçici sıralamaya itiraz (istanze di revisione) bando takvimine göre.",
    iseeLimit: '€24.000,00',
    ispeLimit: '€50.000,00',
    benefits: [
      'Borsa di studio (yıllık nakit; fuori sede / pendolare / in sede)',
      'Posto alloggio (ERDIS yurdu; yer verilemezse nakit karşılığı)',
      'Ristorazione (bursiyerlere ücretsiz: fuori sede günde 2, pendolare günde 1 öğün; değeri nakit kısımdan düşülür)',
      'Uluslararası hareketlilik katkısı (aylık 600 €, en fazla 10 ay)',
      "Premio di laurea (zamanında mezunlara son yıl nakit payının yarısı; başvuru 18 Aralık 2027'ye kadar)",
      "Burs tutarı 2026/27 (ISEE 12.000,01–16.000 € tam tutar): fuori sede 7.171,11 €, pendolare 4.190,71 €, in sede 2.890,16 €; ISEE ≤ 12.000 € için +%15, 16.000 €'nin üstünde kademeli indirim; doktora öğrencileri her zaman fuori sede tutarı alır",
    ],
    housingSupport:
      'Yurt yeri, fuori sede bursiyerlere kontenjan ve sıralamaya göre 10 ay için (ulteriore semestre: 5 ay) verilir; yerleştirme geçici sıralamanın hemen ardından yapılır ve birkaç gün içinde kabul bildirilmesi gerekir. Kesin sıralamada bursu kaybeden öğrenci odayı boşaltır.',
    canteenSupport:
      'Bursiyerlere tüm dönem ücretsiz yemekhane: fuori sede günde 2 öğün (yıllık değer 2.011 €), pendolare günde 1 öğün (1.005,50 €); bu değer bursun nakit kısmından düşülür. Fon yetersizliğinden burs alamayan idonei öğrenciler de yemekhaneden yararlanır.',
    internationalStudentNotes:
      "İtalya'da ikamet etmeyen (AB dışı veya ailesi yurt dışında yaşayan AB) öğrenciler için parificato ISEEU/ISPEU hesabını ERDIS'in kendi ofisi yapar; kendi beyanı kabul edilmez. Belgeler: aile bileşimi, 2024 gelirleri, 31.12.2024 gayrimenkul ve mali varlıklar (ilgili ülke makamından, aslı). Ailesi İtalya'da yaşamayan yabancı öğrenciler her zaman fuori sede sayılır.",
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://erdis.it/documenti/3615115/bando-borsa-studio-2026-2027',
      'https://bandi.regione.marche.it/Allegati/28571/Bando%20BORSA%20a.a.%202026_2027_al%2013_7_2026_Cda.pdf',
      'https://erdis.it/notizie/3615023/pubblicato-bando-borsa-studio-erdis-marche-2026',
      'https://erdis.it/documenti/3161373/faq',
    ],
    lastVerifiedAt: '2026-09-23',
    statusNote:
      "ERDIS Marche 2026/2027 bandosu (13 Temmuz 2026) ve resmi duyuruları üzerinden doğrulandı (23 Eylül 2026); başvuru 28 Ağustos 2026'da kapandı, geçici sıralamalar 18 Eylül'de yayımlandı.",
    completeness: 'verified-full',
  },
  {
    regionSlug: 'molise',
    regionName: 'Molise',
    managingBodies: [{ name: 'ESU Molise', officialUrl: 'https://www.esu.molise.it/' }],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.esu.molise.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'piemonte',
    regionName: 'Piemonte',
    managingBodies: [{ name: 'EDISU Piemonte', officialUrl: 'https://www.edisu.piemonte.it/' }],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      'Bando 21 Temmuz 2026\'da yayımlandı. Lisans ve yüksek lisans (burs ve yurt): 22 Temmuz – 4 Eylül 2026 saat 12:00 (kapandı). Doktora, uzmanlık ve %46 ve üzeri engel katkısı: 28 Ekim – 27 Kasım 2026 saat 12:00. Başka bölgedeki "semestre filtro" öğrencileri 6 Şubat 2027\'den, premio di laurea 4 Mayıs 2027\'den itibaren. Sıralamalar: yurt kesin listesi 25 Eylül 2026; burs geçici listesi 21 Ekim, kesin liste 16 Aralık 2026 (31 Ekim\'e kadar kayıt yaptıran birinci sınıflar için 9 Kasım 2026).',
    iseeLimit: '€26.306,25',
    ispeLimit: '€57.187,53',
    benefits: [
      'Borsa di studio (ISEE bandı ve in sede / pendolare / fuori sede tipine göre; tutarlar 150 € yemekhane katkısı düşülmüş)',
      "Servizio abitativo (EDISU yurdunda yatak; bursla birlikte istenir; 2026/27: 3.100 yatak, 2.706'sı Torino ve çevresi)",
      "Ristorazione (bursiyerlere tam öğün 3 €; fon biterse üst sınıf idonei öğrencilere Ocak 2027'den itibaren günde bir ücretsiz öğün)",
      'Premio di laurea (kalan fon varsa; 2025/26 net bursunun yarısı)',
      '%46 ve üzeri engelli öğrenciler için ayrı katkı (bursla birlikte alınamaz)',
      'Bölgesel DSU vergisi iadesi (140 €; başarı şartını sağlayan birinci sınıf bursiyer ve idonei)',
      'Burs tutarı 2026/27 (ISEE ≤ 13.153,12 €, tam zamanlı): in sede 3.173,68 €, pendolare 4.669,32 €, fuori sede 8.096,78 € (EDISU yurdu alanlarda nakit 5.396,78 € + 2.700 € değerinde yurt); en üst bantta (ISEE 23.626–26.306,25 €) 1.295,08 / 1.945,36 / 3.800 €; STEM kadın öğrencilere artırılmış tutarlar',
    ],
    housingSupport:
      "Yurt yalnız bursla birlikte istenir; fuori sede ve bağımsız öğrencilere açıktır. 2026/27 için 3.100 yatak: Torino ve çevresi 2.706, Novara 167, Alessandria 93, Vercelli 93, Cuneo 23, Biella 11, Asti 7; kontenjanlar üst sınıflar, birinci sınıflar ve AB dışı birinci sınıflar arasında bölünür. Yurt alanlarda 2.700 €'luk yurt değeri bursun nakit kısmından düşülür. Yurt kesin listesi 25 Eylül 2026, kabul bildirimi 25–29 Eylül.",
    canteenSupport:
      "Bursiyerler EDISU yemekhanelerinde en düşük gelir bandı tarifesiyle yer: 2026/27'de tam öğün 3 €. Her burs tutarından 150 € yemekhane katkısı düşülür. Burs fonu bütün idonei öğrencilere yetmezse, üst sınıf idonei öğrenciler Ocak 2027'den itibaren günde bir ücretsiz öğün alır.",
    internationalStudentNotes:
      "Ailesi tamamen İtalya'da yaşayanlar için yalnız ISEE Universitario yeterlidir; ailesi kısmen de olsa yurt dışında yaşayan AB ve AB dışı öğrenciler ISEE Parificato hesabı için konsolosluk belgeleri sunar: aile bileşimi, her yetişkin üyenin yurt dışı brüt geliri (AB vatandaşları için 2024, AB dışı için 2025), taşınır ve taşınmaz varlıklar; belgeler aslı ve yeminli İtalyanca çevirisiyle, apostilli/onaylı olmalıdır. Yeni kural (2026/27): öğrenci vizesi (tip D) gereken uluslararası öğrenciler vize taramasını başvuruya ekler. Bağımsız öğrenci sayılmak için en az 9.000 € yıllık gelir şartı vardır.",
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.edisu.piemonte.it/borse-e-contributi/benefici-economici/borsa-di-studio',
      'https://www.edisu.piemonte.it/novita/notices/richiesta-benefici-202627-pubblicazione-bando-di-concorso-e-avvio-procedura',
      'https://www.edisu.piemonte.it/sites/default/files/documentazione/bandi-di-concorso/Bando_borsa_di_studio_servizio_abitativo_premio_di_laurea_contributo_studenti_con_disabilit%C3%A0_dal_46_p.c._iscritti_al_collocamento_mirato_a.a._2026-27_0.pdf',
    ],
    lastVerifiedAt: '2026-09-24',
    statusNote:
      "EDISU Piemonte 2026/2027 bandosu (21 Temmuz 2026, 188 sayfa) ve resmi duyuru sayfası üzerinden doğrulandı (24 Eylül 2026); lisans başvurusu 4 Eylül 2026'da kapandı, doktora penceresi 28 Ekim 2026'da açılıyor.",
    completeness: 'verified-full',
  },
  {
    regionSlug: 'puglia',
    regionName: 'Puglia',
    managingBodies: [{ name: 'ADISU Puglia', officialUrl: 'https://www.adisupuglia.it/' }],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      'Lisans, tek kademeli ve yüksek lisans: 14 Temmuz 2026 saat 08:00 – 13 Ağustos 2026 saat 12:00 (kapandı). Doktora ve uzmanlık: 1 Ekim 2026 saat 08:00 – 30 Ekim 2026 saat 12:00. Geçici sıralamaya itiraz: lisans 4–14 Eylül 2026, doktora 11–20 Kasım 2026; fuori sede için kira sözleşmesi teslimi lisansta 1–20 Kasım 2026.',
    iseeLimit: '€26.000,00',
    ispeLimit: '€56.000,00',
    benefits: [
      'Borsa di studio (nakit)',
      'Posto alloggio (2026/27: 2.139 yatak; Bari 1.434, Foggia 246, Lecce 579, Taranto 40 + anlaşmalı özel yurtlar)',
      'Ristorazione (günde 1 öğün, yılda en fazla 310; burstan 900 € hizmet kesintisi; fuori sede ikinci öğün için +900 €)',
      'Premio di laurea',
      'Uluslararası hareketlilik katkısı ve yol masrafı',
      'Çift kayıt katkısı; engelli öğrenci destekleri ve öncelikli yurt',
      'Bölgesel DSU vergisi (146 / 170 / 195 €) iadesi',
      "Burs tutarı 2026/27 (temel): fuori sede 7.172 €, pendolare 4.191 €, in sede 2.891 €; ISEE bandına ve duruma göre indirim/artış (eşiğin 2/3'ünün üstündeki ISEE'de indirim)",
    ],
    housingSupport:
      'Fuori sede öğrencilere ekonomik (md. 9) ve başarı (md. 12) şartlarıyla verilir. 2026/27 için bölge genelinde 2.139 yatak (Bari 1.434, Foggia 246, Lecce 579, Taranto 40; değişebilir) ve dört anlaşmalı özel yurt; CUS Bari sporcuları ve UNICORE bursiyerleri için ayrılmış kontenjanlar.',
    canteenSupport:
      'Kazananlar ve idonei ADISU yemekhanelerini, anlaşmalı restoranları veya kuponu kullanır: herkese günde 1 öğün (yılda en fazla 310) karşılığında burstan 900 € kesinti; fuori sede ikinci öğün için 900 € daha. Yemek seçeneği olmayan yerleşkelerde kesinti yapılmaz.',
    internationalStudentNotes:
      'Ailesi İtalya dışında yaşayan ve geliri yurt dışında olan öğrenciler (bando md. 10) 2025 yurt dışı gelirini, 31.12.2025 taşınır/taşınmaz varlıklarını (gayrimenkul m² başına 500 € üzerinden, döviz 2025 ortalama kuruyla) ve aile bileşimini beyan eder. Belgeler ailenin yaşadığı ülkenin yetkili makamından, İtalyanca çevirili ve onaylı/apostilli olarak başvuru son tarihine kadar eklenir; aksi halde başvuru dışı kalır.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://adisupuglia.it/area_letturaNotizia/636384/pagsistema.html',
      'https://adisupuglia.it//output_allegato.php?id=1444063',
      'https://www.adisupuglia.it/pagina106703_borse-di-studio.html',
      'https://www.adisupuglia.it/',
    ],
    lastVerifiedAt: '2026-09-23',
    statusNote:
      "ADISU Puglia 2026/2027 bandosu (CdA kararı n. 31, 30 Haziran 2026; duyuru 6 Temmuz 2026) üzerinden doğrulandı (23 Eylül 2026); lisans başvurusu 13 Ağustos 2026'da kapandı, doktora penceresi 1 Ekim 2026'da açılıyor.",
    completeness: 'verified-full',
  },
  {
    regionSlug: 'sardegna',
    regionName: 'Sardegna',
    managingBodies: [
      { name: 'ERSU Cagliari', officialUrl: 'https://ersucagliari.it/' },
      { name: 'ERSU Sassari', officialUrl: 'https://ersusassari.it/' },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://ersucagliari.it/',
      'https://ersusassari.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'sicilia',
    regionName: 'Sicilia',
    managingBodies: [
      { name: 'ERSU Palermo', officialUrl: 'https://www.ersupalermo.it/' },
      { name: 'ERSU Catania', officialUrl: 'https://www.ersucatania.it/' },
      { name: 'ERSU Messina', officialUrl: 'https://www.ersumessina.it/' },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.ersupalermo.it/',
      'https://www.ersucatania.it/',
      'https://www.ersumessina.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'toscana',
    regionName: 'Toscana',
    managingBodies: [{ name: 'DSU Toscana', officialUrl: 'https://www.dsu.toscana.it/' }],
    currentAcademicYear: '2026/2027',
    applicationWindow:
      'Lisans ve yüksek lisans: 20 Temmuz 2026 saat 12:00 – 7 Eylül 2026 saat 13:00 (kapandı). Doktora ve uzmanlık: 25 Eylül – 16 Kasım 2026 saat 13:00. Başka bölgedeki "semestre filtro" öğrencileri için ayrı pencere. In sede / fuori sede statü düzeltmesi lisansta 10 Ekim 2026\'ya kadar; sıralama ve itiraz (istanza di riesame) tarihleri bando takvimine göre.',
    iseeLimit: '€27.000,00',
    ispeLimit: '€60.000,00',
    benefits: [
      'Borsa di studio (nakit + ücretsiz hizmetlerin değeri)',
      'Servizio mensa (bursiyerlere ücretsiz: in sede ve pendolare günde 1, fuori sede günde 2 öğün)',
      'Posto alloggio (fuori sede bursiyerlere ücretsiz yurt; yer yoksa contributo affitto: yıllık 3.150 € veya dönemlik 1.575 €)',
      'Bölgesel DSU vergisi muafiyeti (140 €; kazananlar ve idonei)',
      'Uluslararası hareketlilik katkısı (aylık 600 € + yol masrafı)',
      'Burs tutarı 2026/27 (ISEE ≤ 13.500 €, genel öğrenci): in sede 2.385 € + günde 1 öğün, pendolare 3.880 € + 1 öğün, fuori sede 3.338 € + günde 2 öğün + ücretsiz yurt; kadın STEM ve bağımsız öğrenciler için ayrı tablolar',
      'Engelli öğrenciler için daha yüksek eşik: ISEE 34.600 € / ISPE 70.000 €',
    ],
    housingSupport:
      "Ücretsiz yurt yeri yalnız fuori sede burs kazananlarına verilir ve olağan başvuru içinde talep edilir. İdoneo olup kazanamayan fuori sede öğrenciler yer varsa aylık 262,50 € ücret (+ eşit depozito) ile kalabilir. 2026/27 kontenjanı: Firenze 1.917, Pisa 1.705 (25'i Carrara), Siena 1.200; yer verilemezse contributo affitto ödenir.",
    canteenSupport:
      "Bursiyerler üniversite yemekhanelerinde veya anlaşmalı restoranlarda ücretsiz yer: in sede ve pendolare günde 1, fuori sede günde 2 öğün. Dönemler: yıllık burs 1 Ekim 2026–30 Eylül 2027, dönemlik burs 31 Mart 2027'ye kadar, doktora/uzmanlık 2027 takvim yılı.",
    internationalStudentNotes:
      "Yabancı öğrenciler, yurt dışında yaşayan İtalyanlar, vatansızlar, mülteciler ve sığınmacılar İtalyan öğrencilerle aynı şartlarla başvurur. Ailesi İtalya'da yaşayan ve yurt dışında gelir/mal varlığı olmayanlar standart ISEE (DSU) ile değerlendirilir. Yurt dışında gelir veya mal varlığı olanlar: AB ülkeleri için resmi form (Appendice D) ile beyan; AB dışı için 2026'da ilgili ülke makamınca düzenlenmiş, yeminli çevirili ve apostilli/onaylı 2025 gelir ve 31.12.2025 mal varlığı belgeleri.",
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.dsu.toscana.it/-/borsa-di-studio-e-posto-alloggio-a.a.-2026-2027',
      'https://www.dsu.toscana.it/documents/d/ardsu/bando-borsa-alloggio-26-27',
      'https://www.dsu.toscana.it/borsa-di-studio',
      'https://www.dsu.toscana.it/',
    ],
    lastVerifiedAt: '2026-09-23',
    statusNote:
      "DSU Toscana 2026/2027 bandosu (CdA kararı n. 27, 16 Temmuz 2026) ve resmi çağrı sayfası üzerinden doğrulandı (23 Eylül 2026); lisans başvurusu 7 Eylül 2026'da kapandı, doktora penceresi 25 Eylül 2026'da açılıyor.",
    completeness: 'verified-full',
  },
  {
    regionSlug: 'trentino-alto-adige-suedtirol',
    regionName: 'Trentino-Alto Adige/Suedtirol',
    managingBodies: [
      { name: 'Opera Universitaria Trento', officialUrl: 'https://operauni.tn.it/' },
      {
        name: 'Provincia Autonoma di Bolzano - Ufficio per il diritto allo studio universitario',
        officialUrl: 'https://diritto-allo-studio.provincia.bz.it/it/home',
      },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://operauni.tn.it/',
      'https://home.provincia.bz.it/it/contatti/2677',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'umbria',
    regionName: 'Umbria',
    managingBodies: [{ name: 'ADiSU Umbria', officialUrl: 'https://www.adisu.umbria.it/' }],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.adisu.umbria.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'valle-d-aosta',
    regionName: "Valle d'Aosta",
    managingBodies: [
      {
        name: "Regione Autonoma Valle d'Aosta - Ufficio borse di studio universitarie",
        officialUrl: 'https://www.regione.vda.it/istruzione/dirittostudio/borse_universita_valdostane/default_i.aspx',
      },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.regione.vda.it/istruzione/dirittostudio/borse_universita_valdostane/default_i.aspx',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
  {
    regionSlug: 'veneto',
    regionName: 'Veneto',
    managingBodies: [
      { name: 'ESU Padova', officialUrl: 'https://www.esu.pd.it/' },
      { name: 'ESU Venezia', officialUrl: 'https://www.esuvenezia.it/' },
      { name: 'ESU Verona', officialUrl: 'https://www.esu.vr.it/' },
    ],
    currentAcademicYear: null,
    applicationWindow: null,
    iseeLimit: null,
    ispeLimit: null,
    benefits: [],
    housingSupport: null,
    canteenSupport: null,
    internationalStudentNotes: null,
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.regione.veneto.it/web/formazione-e-istruzione/dsu',
      'https://www.esu.pd.it/',
      'https://www.esuvenezia.it/',
      'https://www.esu.vr.it/',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote: REGISTRY_PENDING_NOTE,
    completeness: 'registry-only',
  },
];

export const SCHOLARSHIP_REGION_MAP: Record<RegionSlug, ScholarshipRegionRecord> =
  SCHOLARSHIP_REGIONS.reduce((acc, region) => {
    acc[region.regionSlug] = region;
    return acc;
  }, {} as Record<RegionSlug, ScholarshipRegionRecord>);

const scholarshipRegionSlugSet = new Set<RegionSlug>(
  SCHOLARSHIP_REGIONS.map((region) => region.regionSlug)
);

export function isRegionSlug(value: string | null): value is RegionSlug {
  return value !== null && scholarshipRegionSlugSet.has(value as RegionSlug);
}

export function getScholarshipRegionBySlug(
  slug: RegionSlug
): ScholarshipRegionRecord {
  return SCHOLARSHIP_REGION_MAP[slug];
}
