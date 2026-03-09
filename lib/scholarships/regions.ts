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
    currentAcademicYear: '2025/2026',
    applicationWindow: '4 Ağustos 2025 - 18 Eylül 2025 12:00 (online başvuru).',
    iseeLimit: '€25.500,00',
    ispeLimit: '€54.000,00',
    benefits: [
      'Burs (nakit + hizmet bileşeni)',
      'Posto alloggio (yurt)',
      'Uluslararası hareketlilik katkısı',
    ],
    housingSupport:
      'ADISURC yurtları için başvuru aynı çağrı kapsamında yürür; yerleştirme kontenjan ve sıralamaya göre yapılır.',
    canteenSupport:
      'Ristorazione hizmeti bando kapsamında tanımlanır; uygunluk durumuna göre indirimli/ücretsiz erişim sağlanır.',
    internationalStudentNotes:
      'Yurt dışı gelirli öğrenciler için ISEE parificato gerekir; ADISURC resmi sayfasında CAF ve belge listesi yayınlanır.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.adisurcampania.it/notizie/approvazione-bando-di-concorso-20252026',
      'https://www.adisurcampania.it/sites/default/files/2025-08/Bando%20di%20Concorso%20a.a.%202025.26.pdf',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'ADISURC 2025/2026 resmi bando ve bando sayfası üzerinden doğrulandı (9 Mart 2026 itibarıyla).',
    completeness: 'verified-full',
  },
  {
    regionSlug: 'emilia-romagna',
    regionName: 'Emilia-Romagna',
    managingBodies: [{ name: 'ER.GO', officialUrl: 'https://www.er-go.it/' }],
    currentAcademicYear: '2025/2026',
    applicationWindow:
      'ER.GO 2025/2026 takvimi fayda türüne göre değişir; kesin son tarihler resmi bando takviminde ilan edilir.',
    iseeLimit: '€25.000,00',
    ispeLimit: '€50.000,00',
    benefits: [
      'Borsa di studio',
      'Alloggio (yurt) desteği',
      'Ristorazione (yemek) desteği',
      'Uluslararası hareketlilik katkıları',
    ],
    housingSupport:
      'Alloggio başvuruları ER.GO prosedürü ile yürür; kontenjan ve sıralamaya göre yerleştirme yapılır.',
    canteenSupport:
      'Ristorazione erişimi için ISEE/ISPE ve bando şartlarına göre uygunluk değerlendirilir.',
    internationalStudentNotes:
      'Uluslararası öğrenciler için ekonomik dokümantasyon ve ISEE parificato süreçleri ER.GO bando ve rehberlerinde ayrı açıklanır.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.er-go.it/it/borse-di-studio/bando-e-benefici/',
      'https://www.er-go.it/cosa-fare-per/bandi-di-concorso/soglie-economiche-per-laccesso',
      'https://www.er-go.it/wp-content/uploads/2025/07/Bando-benefici-ERGO-a.a.-2025_2026.pdf',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'ER.GO resmi bando/soglia kaynakları üzerinden doğrulandı (9 Mart 2026 itibarıyla).',
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
    currentAcademicYear: '2025/2026',
    applicationWindow:
      '1. faz son tarih 22 Temmuz 2025 12:00; 2. faz düzeltme penceresi 30 Temmuz 2025 - 11 Ağustos 2025 12:00.',
    iseeLimit: '€27.948,60',
    ispeLimit: '€60.757,87',
    benefits: [
      'Borsa di studio',
      'Posto alloggio (yurt)',
      'Contributo mobilita internazionale',
      'Premio di laurea',
    ],
    housingSupport:
      'DiSCo yurtları için başvuru ve sıralama bando hükümlerine göre yapılır; ayrıca agevolata alloggio çağrıları ayrı açılabilir.',
    canteenSupport: 'DiSCo öğrenci hizmetleri kapsamında yemek desteği uygulanır.',
    internationalStudentNotes:
      'Yurt dışında yaşayan uluslararası öğrenciler ISEEUP sürecini DiSCo tarafından belirtilen CAF üzerinden tamamlar.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://laziodisco.it/bandi/bando-diritto-allo-studio-a-a-2025-2026/',
      'https://laziodisco.it/news-it/bando-diritto-allo-studio-2025-2026-scadenza-prima-fase-22-luglio-2025-ore-1200/',
      'https://laziodisco.it/wp-content/uploads/2025/06/BANDO-DIRITTO-ALLO-STUDIO_25-26.pdf',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'DiSCo 2025/2026 resmi bando ve resmi scadenza duyuruları üzerinden doğrulandı (9 Mart 2026 itibarıyla).',
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
          'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/DettaglioServizio/servizi-e-informazioni/Cittadini/scuola-universita-e-ricerca/Universita-e-formazione-accademica/diritto-studio-universitario/diritto-studio-universitario',
      },
      {
        name: 'Universita / AFAM / SSML kurumlari (kurum bazli bando)',
        officialUrl: 'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      },
    ],
    currentAcademicYear: '2025/2026',
    applicationWindow:
      'Kurum bazlı değişir; başvuru başlangıç/bitiş tarihleri her üniversite-AFAM kurumu tarafından ilan edilir.',
    iseeLimit: '€26.516,70',
    ispeLimit: '€57.645,03',
    benefits: ['Borsa di studio', 'Posto alloggio', 'Yemek ve diğer DSU hizmetleri (kurum bazlı)'],
    housingSupport:
      'Yurt/konaklama desteği kurum bazlı bandolarda belirlenir; kriterler ve kontenjanlar kurumlar arasında farklılaşabilir.',
    canteenSupport:
      'Yemek desteği kurum bazlı uygulanır; erişim kuralları ilgili üniversite veya AFAM kurumunun bandosunda yer alır.',
    internationalStudentNotes:
      'Uluslararası öğrenciler için belge ve eşdeğer ekonomik gösterge (ISEE parificato/ISPEU) uygulamaları kurum bazlı duyurulur.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/DettaglioServizio/servizi-e-informazioni/Cittadini/scuola-universita-e-ricerca/Universita-e-formazione-accademica/diritto-studio-universitario/diritto-studio-universitario',
      'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/DettaglioAvviso/servizi-e-informazioni/cittadini/scuola-universita-e-ricerca/Universita-e-formazione-accademica/dsu-2025-2026/dsu-2025-2026',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'Lombardia için eşikler bölgesel resmi kaynaktan doğrulandı; takvimlerin kurum bazlı değiştiği resmi metinde belirtiliyor (9 Mart 2026 itibarıyla).',
    completeness: 'verified-full',
  },
  {
    regionSlug: 'marche',
    regionName: 'Marche',
    managingBodies: [{ name: 'ERDIS Marche', officialUrl: 'https://erdis.it/' }],
    currentAcademicYear: '2025/2026',
    applicationWindow: 'Borsa başvurusu için son tarih 26 Ağustos 2025 (bando madde 10.1).',
    iseeLimit: '€24.000,00',
    ispeLimit: '€50.000,00',
    benefits: [
      'Borsa di studio',
      'Posto alloggio',
      'Servizio ristorazione',
      'Contributo mobilita internazionale',
    ],
    housingSupport:
      'Alloggio desteği ERDIS bando kurallarına ve kontenjana bağlıdır; dışarıda kalanlar için kira sözleşmesi beyanı istenebilir.',
    canteenSupport: 'Mensa desteği bando kapsamında yer alır ve uygunluk durumuna göre uygulanır.',
    internationalStudentNotes:
      'Yurt dışı aile gelirine sahip öğrenciler için ISEE/ISPE parificato hesaplamasında resmi belge sunumu gerekir.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://erdis.it/avvisi/erdis-marche-bando-dsu-per-lanno-accademico-2025-2026/',
      'https://erdis.it/documenti/3161255/bando-borsa-studio-aa-2024-2025',
      'https://bandi.regione.marche.it/Allegati/18484/Bando%20BORSA%20a.a.%202025_2026_Erdis.pdf',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'ERDIS 2025/2026 bando metni ve resmi duyuru kaynaklarından doğrulandı (9 Mart 2026 itibarıyla).',
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
    currentAcademicYear: '2025/2026',
    applicationWindow:
      'Bando 25 Temmuz 2025 tarihinde açıldı; son tarihler borsa/alloggio ve öğrenci tipine göre değişiyor (EDISU resmi takvimi).',
    iseeLimit: '€26.306,25',
    ispeLimit: '€57.187,53',
    benefits: [
      'Borsa di studio',
      'Servizio abitativo (yurt)',
      'Ristorazione (yemek) desteği',
      'Premio di laurea',
    ],
    housingSupport:
      'Yurt hizmeti EDISU başvuru ve atama süreçleriyle yürür; kontenjan ve sıralama kuralları bandoya tabidir.',
    canteenSupport: 'Mensa/ristorazione desteği EDISU tarafından bando ve tarifelere göre sağlanır.',
    internationalStudentNotes:
      'Uluslararası öğrenciler için ISEE parificato ve konsolosluk belgeleri EDISU rehberleri doğrultusunda değerlendirilir.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.edisu.piemonte.it/it/servizi/borse-e-altri-contributi/borsa-di-studio',
      'https://www.edisu.piemonte.it/sites/default/files/bando_25_26.pdf',
      'https://www.edisu.piemonte.it/sites/default/files/schede-informative-governance/comunicati-stampa/25luglio2025-Bandoborsedistudio25_26.pdf',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'EDISU Piemonte resmi bando ve resmi iletişim dokümanları üzerinden doğrulandı (9 Mart 2026 itibarıyla).',
    completeness: 'verified-full',
  },
  {
    regionSlug: 'puglia',
    regionName: 'Puglia',
    managingBodies: [{ name: 'ADISU Puglia', officialUrl: 'https://www.adisupuglia.it/' }],
    currentAcademicYear: '2025/2026',
    applicationWindow:
      'Lisans/kademeli programlar: 15 Temmuz 2025 08:00 - 19 Ağustos 2025 12:00; doktora/uzmanlık: 1 Ekim 2025 08:00 - 10 Kasım 2025 12:00.',
    iseeLimit: '€26.000,00',
    ispeLimit: '€56.000,00',
    benefits: ['Borsa di studio', 'Posto alloggio', 'Servizio ristorazione', 'Diğer ADISU hizmetleri'],
    housingSupport:
      'Yurt desteği ADISU Puglia bando koşullarına göre verilir; atama süreçleri sede bazında yürütülür.',
    canteenSupport: 'Yemek hizmeti ADISU tarafından bando ve iç düzenlemelere göre sunulur.',
    internationalStudentNotes:
      'Uluslararası öğrenciler için ekonomik uygunluk ISEE/ISEE parificato esaslarıyla ve resmi bando belgeleriyle değerlendirilir.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.adisupuglia.it/area_letturaNotizia/570028/pagsistema.html',
      'https://adisupuglia.portaleamministrazionetrasparente.it/archiviofile/adisupuglia/sovvenzioni/bando%20benefici%20e%20servizi%202025%202026/0.5.A._ALL_DELIBERA_N_42_DEL_03_07_2025__BANDO_A.A._2025_2026_2_ALLEGATO_ALLA_DELIBERAZIONE_SIGNED_SIGNED.PDF',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'ADISU Puglia resmi duyuru ve resmi bando PDF kaynakları üzerinden doğrulandı (9 Mart 2026 itibarıyla).',
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
    currentAcademicYear: '2025/2026',
    applicationWindow:
      'Lisans: 15 Temmuz 2025 - 5 Eylül 2025 13:00; doktora/uzmanlık: 25 Eylül 2025 - 14 Kasım 2025 13:00.',
    iseeLimit: '€27.000,00',
    ispeLimit: '€60.000,00',
    benefits: ['Borsa di studio', 'Posto alloggio', 'Ristorazione (ücretsiz erişim)', 'Tassa regionale muafiyeti'],
    housingSupport:
      'Fuori sede öğrenciler için kontenjan dahilinde alloggio tahsisi yapılır; uygun koşullarda contributo affitto mekanizması da uygulanır.',
    canteenSupport:
      'Burs kazanan ve idonei öğrenciler için DSU ristorazione hizmetine erişim sağlanır.',
    internationalStudentNotes:
      'Yurt dışı gelirli öğrenciler için ekonomik/familia belgeleri Art. 8 kapsamındaki resmi dokümantasyonla sunulur.',
    officialSourceUrls: [
      'https://www.universitaly.it/borse-studio/enti-diritto-studio',
      'https://www.dsu.toscana.it/-/borsa-di-studio-a.a.-2025-2026',
      'https://www.dsu.toscana.it/documents/4390857/25715397/bando%2Bborsa%2Balloggio%2B2025-2026.pdf/1efc2b0f-8368-5313-baad-3e3197223030?t=1752493938665',
    ],
    lastVerifiedAt: '2026-03-09',
    statusNote:
      'DSU Toscana resmi bando ve resmi sayfa metni üzerinden doğrulandı (9 Mart 2026 itibarıyla).',
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
