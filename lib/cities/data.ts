import type { CityDetail } from "@/types/cities";

export const CURATED_CITIES: CityDetail[] = [
  {
    slug: "milano",
    name: "Milano",
    nameEn: "Milan",
    region: "Lombardia",
    costRating: 5,
    studentPopulation: "Çok Yüksek (>85.000)",
    studentPopulationEn: "Very High (>85,000)",
    rentAverage: "Tek kişilik oda: 600€ - 850€ | Stüdyo daire: 950€ - 1300€",
    rentAverageEn: "Single room: €600 - €850 | Studio apartment: €950 - €1300",
    livingExpenses: "Aylık 350€ - 450€ (Mutfak, sosyal etkinlikler, spor)",
    livingExpensesEn: "€350 - €450 monthly (Groceries, dining out, leisure)",
    transportCost: "Öğrenci aylık kartı: 22€ (ATM Milano tüm hatlar)",
    transportCostEn: "Student monthly pass: €22 (ATM Milan all lines)",
    transportDetails: "4 aktif metro hattı (M1, M2, M3, M5), son derece geniş tramvay ve otobüs ağı. Malpensa, Linate ve Bergamo (Orio al Serio) olmak üzere 3 büyük havalimanı bağlantısı mevcuttur.",
    transportDetailsEn: "4 active metro lines (M1, M2, M3, M5), extensive tram and bus network. Directly connected to 3 airports: Malpensa, Linate, and Bergamo (Orio al Serio).",
    climateAndVibe: "Kışlar soğuk ve sisli, yazlar ise sıcak ve nemlidir. İtalya'nın finans, moda ve tasarım merkezidir. Hızlı, dinamik ve Avrupa standartlarında kozmopolit bir metropol yaşantısı sunar. Sosyal hayat, kültürel etkinlikler ve kariyer fırsatları zirvededir.",
    climateAndVibeEn: "Winters are cold and foggy, summers are warm and humid. Milan is Italy's financial, fashion, and design powerhouse. It offers a fast-paced, dynamic, and highly cosmopolitan metropolitan environment with outstanding career opportunities.",
    editorialTip: "Ev bulma rekabeti aşırı yüksektir; kabulünüz gelir gelmez okul yurtlarına veya Spotahome/Uniplaces gibi doğrulanmış platformlara hemen başvurun. Ulaşım kartınızı online olarak ATM portalından ilk hafta sipariş edin.",
    editorialTipEn: "Housing competition is extremely high; apply for university accommodation or platforms like Spotahome/Uniplaces as soon as admitted. Order your ATM student card online during your first week."
  },
  {
    slug: "roma",
    name: "Roma",
    nameEn: "Rome",
    region: "Lazio",
    costRating: 4,
    studentPopulation: "Çok Yüksek (>90.000)",
    studentPopulationEn: "Very High (>90,000)",
    rentAverage: "Tek kişilik oda: 450€ - 650€ | Stüdyo daire: 750€ - 1050€",
    rentAverageEn: "Single room: €450 - €650 | Studio apartment: €750 - €1,050",
    livingExpenses: "Aylık 300€ - 400€ (Sakin mutfak alışverişi ve tarihi sokaklarda sosyal yaşam)",
    livingExpensesEn: "€300 - €400 monthly (Groceries, street food, and historic center leisure)",
    transportCost: "Yıllık öğrenci kartı: 130€ - 150€ (Metrebus Roma)",
    transportCostEn: "Annual student pass: €130 - €150 (Metrebus Rome)",
    transportDetails: "3 aktif metro hattı (A, B, C) ve geniş otobüs ağları. Şehir içi otobüslerde trafik nedeniyle gecikmeler yaşanabilir. Fiumicino (FCO) ve Ciampino (CIA) havalimanlarına doğrudan tren/otobüs hatları bulunur.",
    transportDetailsEn: "3 active metro lines (A, B, C) and vast bus networks. Bus routes can be affected by city traffic. Connected directly to Fiumicino (FCO) and Ciampino (CIA) airports via express train/bus lines.",
    climateAndVibe: "Yumuşak Akdeniz iklimi. Kışlar ılık geçer, yazlar ise oldukça sıcaktır. 'Açık hava müzesi' olan şehir, binlerce yıllık tarihi dokusuyla öğrencilere büyüleyici bir hayat sunar. Hayat Milano'ya göre daha yavaş, daha rahat ve Akdeniz ruhuna uygundur.",
    climateAndVibeEn: "Mild Mediterranean climate. Warm, sunny summers and mild winters. Living in Rome is like studying in an open-air museum, offering a mesmerizing historic setting. The pace of life is slower and more relaxed compared to Milan.",
    editorialTip: "Otobüs gecikmelerine alışın ve kampüsünüze yakın veya metro hatlarına (A/B) yürüme mesafesinde ev kiralamaya özen gösterin. Yıllık abonman kartı almak aylık kartlara göre çok daha ekonomiktir.",
    editorialTipEn: "Adapt to bus delays and prioritize renting near Metro A/B lines or your campus. Purchasing the annual student transit card is significantly cheaper than buying monthly ones."
  },
  {
    slug: "bologna",
    name: "Bologna",
    nameEn: "Bologna",
    region: "Emilia-Romagna",
    costRating: 4,
    studentPopulation: "Yüksek (>80.000)",
    studentPopulationEn: "High (>80,000)",
    rentAverage: "Tek kişilik oda: 450€ - 650€ | Stüdyo daire: 800€ - 1100€",
    rentAverageEn: "Single room: €450 - €650 | Studio apartment: €800 - €1,100",
    livingExpenses: "Aylık 300€ - 380€ (Piazza Maggiore çevresi öğrenci dostu mekanlar)",
    livingExpensesEn: "€300 - €380 monthly (Student-friendly spots around Piazza Maggiore)",
    transportCost: "Yıllık TPER öğrenci kartı: 180€",
    transportCostEn: "Annual TPER student pass: €180",
    transportDetails: "Metro yoktur. Şehir içi ulaşım mükemmel işleyen TPER otobüs hatları ve bisiklet yollarıyla sağlanır. Bologna Centrale istasyonu İtalya'nın en büyük tren kavşağıdır, her şehre hızlı tren bulunur. Havalimanına Marconi Express ile 7 dakikada gidilir.",
    transportDetailsEn: "No metro. Public transit relies on excellent TPER buses, extensive bike lanes, and walking. Bologna Centrale is Italy's primary rail hub, making weekend trips to any city extremely easy. Marconi Airport is 7 mins away via Marconi Express.",
    climateAndVibe: "Dört mevsim belirgindir. Kışları serin, yazları sıcaktır. Dünyanın en eski üniversitesine (1088) ev sahipliği yapar. Şehir nüfusunun büyük kısmını öğrenciler oluşturduğu için tam bir öğrenci şehridir. Tarihi revaklar (portici), canlı sokak festivalleri ve soluksuz öğrenci aktiviteleriyle ünlüdür.",
    climateAndVibeEn: "Four distinct seasons; chilly winters and warm summers. Home to the world's oldest university (1088). A true university city where students dominate the population. Renowned for its UNESCO-protected porticoes, vibrant street life, and unmatched student culture.",
    editorialTip: "Bologna'da ev bulmak bazen İtalya'nın en zor sürecine dönüşebilir; ev aramaya Haziran ayında başlayın. Şehirde ulaşım için mutlaka ikinci el bir bisiklet edinin, otobüsten çok daha fazla kullanacaksınız.",
    editorialTipEn: "Finding accommodation in Bologna can be incredibly tough; start your search in early June. Get a second-hand bicycle as soon as you arrive, as it is the absolute best way to navigate the city."
  },
  {
    slug: "torino",
    name: "Torino",
    nameEn: "Turin",
    region: "Piemonte",
    costRating: 3,
    studentPopulation: "Yüksek (>70.000)",
    studentPopulationEn: "High (>70,000)",
    rentAverage: "Tek kişilik oda: 350€ - 500€ | Stüdyo daire: 600€ - 850€",
    rentAverageEn: "Single room: €350 - €500 | Studio apartment: €600 - €850",
    livingExpenses: "Aylık 250€ - 350€ (Kuzey İtalya'nın en ekonomik öğrenci şehirlerinden)",
    livingExpensesEn: "€250 - €350 monthly (One of the most budget-friendly cities in Northern Italy)",
    transportCost: "Öğrenci aylık abonmanı: 22€ (GTT Torino)",
    transportCostEn: "Student monthly pass: €22 (GTT Turin)",
    transportDetails: "1 sürücüsüz metro hattı, tarihi ve yaygın tramvay ağı, modern otobüsler. Tren istasyonlarından (Porta Nuova / Porta Susa) Milano'ya 1 saatte hızlı tren mevcuttur. Torino Caselle havalimanı trenle doğrudan şehre bağlıdır.",
    transportDetailsEn: "1 automated driverless metro line, extensive historic tramway system, and buses. High-speed trains reach Milan in just 1 hour from Porta Nuova/Porta Susa stations. Torino Caselle airport is connected to the city center.",
    climateAndVibe: "Alplere yakınlığı nedeniyle kışlar oldukça soğuk ve karlı geçebilir; yazlar ise ılımandır. Eski İtalya krallığının başkenti olan şehir görkemli sarayları, geniş bulvarları ve düzenli ızgara planı ile çok asildir. Politecnico di Torino ve UniTo sayesinde teknoloji ve mühendislik öğrencileriyle doludur.",
    climateAndVibeEn: "Chilly, snowy winters due to the nearby Alps; mild and pleasant summers. Former capital of the Kingdom of Italy, featuring regal baroque palaces and beautiful boulevards. Powered by UniTo and PoliTo, it is a bustling hub for engineering and science students.",
    editorialTip: "Kuzey İtalya'da yaşayıp bütçesini korumak isteyen öğrenciler için en ideal şehirdir. San Salvario bölgesi gece hayatı ve öğrenci mekanları için popülerdir ancak daha sakin bir çalışma alanı için Crocetta veya Cenisia bölgelerini tercih edin.",
    editorialTipEn: "Torino is the ultimate option for students wanting Northern Italian quality of life at affordable rates. San Salvario is famous for nightlife, while Crocetta or Cenisia are ideal for peaceful studying."
  },
  {
    slug: "padova",
    name: "Padova",
    nameEn: "Padua",
    region: "Veneto",
    costRating: 3,
    studentPopulation: "Orta-Yüksek (>65.000)",
    studentPopulationEn: "Medium-High (>65,000)",
    rentAverage: "Tek kişilik oda: 350€ - 500€ | Stüdyo daire: 600€ - 800€",
    rentAverageEn: "Single room: €350 - €500 | Studio apartment: €600 - €800",
    livingExpenses: "Aylık 250€ - 330€ (Üniversite kantinleri ve öğrenci pazarları çok aktiftir)",
    livingExpensesEn: "€250 - €330 monthly (Active student markets and highly subsidized canteens)",
    transportCost: "Aylık öğrenci otobüs/tramvay kartı: 25€ (APS)",
    transportCostEn: "Student monthly transit pass: €25 (APS)",
    transportDetails: "Mükemmel çalışan tek raylı tramvay (Translohr) ve otobüs hatları. Venedik'e trenle sadece 25-30 dakika mesafededir. Venedik Marco Polo ve Treviso havalimanlarına doğrudan otobüs bağlantıları mevcuttur.",
    transportDetailsEn: "Highly efficient single-rail tram (Translohr) and buses. Located just 25-30 minutes away from Venice by regional train. Directly connected to Venice Marco Polo and Treviso airports by regular bus services.",
    climateAndVibe: "Nemli ılıman iklim; kışları serin ve yağışlı, yazları sıcaktır. İtalya'nın en köklü ikinci üniversitesine (1222) ev sahipliği yapar. Şehir merkezindeki Piazza delle Erbe ve Piazza della Frutta çevresi her akşam binlerce öğrencinin 'Spritz' eşliğinde buluştuğu harika bir atmosfere sahiptir.",
    climateAndVibeEn: "Humid temperate climate; cool, rainy winters and warm summers. Home to Italy's second-oldest university (1222). The squares (Piazza delle Erbe & Piazza della Frutta) host thousands of students gathering every evening, creating a magnificent social atmosphere.",
    editorialTip: "Ulaşım için bisiklet Padova'da hayatidir, neredeyse herkes bisiklet kullanır. Gelir gelmez yerel öğrenci pazarlarından veya ikinci el gruplarından uygun fiyatlı bir bisiklet ve sağlam bir kilit edinin.",
    editorialTipEn: "Bicycles are a way of life in Padua. Buy a cheap second-hand bike and a very strong lock immediately upon arrival to cruise around like a local."
  },
  {
    slug: "pisa",
    name: "Pisa",
    nameEn: "Pisa",
    region: "Toscana",
    costRating: 3,
    studentPopulation: "Orta (>50.000)",
    studentPopulationEn: "Medium (>50,000)",
    rentAverage: "Tek kişilik oda: 320€ - 450€ | Stüdyo daire: 550€ - 750€",
    rentAverageEn: "Single room: €320 - €450 | Studio apartment: €550 - €750",
    livingExpenses: "Aylık 240€ - 320€ (Toskana'nın göbeğinde ekonomik yaşam)",
    livingExpensesEn: "€240 - €320 monthly (Budget-friendly living in the heart of Tuscany)",
    transportCost: "Aylık öğrenci otobüs kartı: 22€ (Autolinee Toscane)",
    transportCostEn: "Student monthly bus pass: €22 (Autolinee Toscane)",
    transportDetails: "Metro yoktur. Şehir küçük olduğu için toplu taşımaya neredeyse hiç ihtiyaç duyulmaz; yürüyerek veya bisikletle her yere ulaşılabilir. Galileo Galilei Havalimanı (PSA) Toskana'nın ana havalimanıdır ve şehre yürüyerek bile gidilebilecek kadar yakındır (Pisa Mover ile 5 dk).",
    transportDetailsEn: "No metro needed. The city is incredibly compact; walking or cycling is sufficient to reach any campus. Galileo Galilei Airport (PSA) is Tuscany's major hub, located right next to the city (5 mins via Pisa Mover train).",
    climateAndVibe: "Ilıman Akdeniz iklimi; yazlar sıcak ve kurak, kışlar yumuşaktır. Şehir nüfusunun neredeyse yarısı öğrencilerden oluştuğu için benzersiz bir akademi ruhuna sahiptir. Arno Nehri kıyıları (Lungarno), akşamları öğrencilerin buluşma noktasıdır.",
    climateAndVibeEn: "Mild Mediterranean climate; hot, dry summers and mild winters. Students make up nearly half of the city's total population, creating a highly academic and energetic vibe. The Arno riverbanks (Lungarno) serve as the daily social hub for students.",
    editorialTip: "Pisa küçük ve düz bir şehir olduğu için evinizi nerede tutarsanız tutun kampüslere en fazla 15-20 dakika yürüme mesafesinde olursunuz. Pisa Mover veya otobüslere para harcamak yerine yürüyüşün tadını çıkarın.",
    editorialTipEn: "Pisa is flat and compact; no matter where you rent, your campus will be within a 15-20 min walk. Save money on transit and enjoy walking or cycling everywhere."
  },
  {
    slug: "pavia",
    name: "Pavia",
    nameEn: "Pavia",
    region: "Lombardia",
    costRating: 3,
    studentPopulation: "Orta (>25.000)",
    studentPopulationEn: "Medium (>25,000)",
    rentAverage: "Tek kişilik oda: 300€ - 450€ | Stüdyo daire: 550€ - 750€",
    rentAverageEn: "Single room: €300 - €450 | Studio apartment: €550 - €750",
    livingExpenses: "Aylık 250€ - 330€ (Milano'ya göre yarı yarıya daha ekonomik)",
    livingExpensesEn: "€250 - €330 monthly (Nearly twice as cheap as neighboring Milan)",
    transportCost: "Yıllık sınırsız otobüs kartı: 20€ (Autoguidovie Pavia)",
    transportCostEn: "Annual unlimited student bus pass: €20 (Autoguidovie Pavia)",
    transportDetails: "Pavia içi ulaşım otobüslerle sağlanır. Şehir içi banliyö trenleriyle (S13 hattı) Milano merkezine (Rogoredo / Porta Venezia) sadece 30 dakikada doğrudan ulaşım mümkündür.",
    transportDetailsEn: "Local transit is served by Autoguidovie buses. Suburban train (S13 line) connects Pavia directly to central Milan in just 30 minutes, departing every 30 minutes.",
    climateAndVibe: "Karasal iklim özellikleri; kışları soğuk ve sisli, yazları sıcak geçer. İtalya'nın en prestijli tarihi üniversitelerinden birine ev sahipliği yapar. Ünlü 'Collegi' (üniversite kolejleri) sistemi sayesinde Oxford veya Cambridge benzeri çok güçlü bir yurt-kampüs kültürü mevcuttur. Sakin, güvenli ve samimidir.",
    climateAndVibeEn: "Continental climate; cold, foggy winters and hot summers. Home to one of Italy's most prestigious historic universities. Renowned for its unique Oxford-style 'Collegi' (collegiate residency system), fostering a tight-knit and traditional student community.",
    editorialTip: "Pavia Belediyesi ve toplu taşıma kurumu öğrencilere yıllık otobüs kartını sembolik olarak sadece 20€'ya vermektedir. Pavia'da yaşayıp Milano'daki sosyal hayatı banliyö treniyle takip etmek bütçeniz için harika bir formüldür.",
    editorialTipEn: "The local authority offers students an annual unlimited bus pass for a symbolic fee of just €20. Living in Pavia and commuting to Milan via the S13 train is an incredible money-saving life hack."
  },
  {
    slug: "trento",
    name: "Trento",
    nameEn: "Trento",
    region: "Trentino-Alto Adige",
    costRating: 3,
    studentPopulation: "Orta (>20.000)",
    studentPopulationEn: "Medium (>20,000)",
    rentAverage: "Tek kişilik oda: 350€ - 500€ | Stüdyo daire: 600€ - 850€",
    rentAverageEn: "Single room: €350 - €500 | Studio apartment: €600 - €850",
    livingExpenses: "Aylık 280€ - 370€ (Yüksek yaşam kalitesi standartları)",
    livingExpensesEn: "€280 - €370 monthly (High quality of life standard expenses)",
    transportCost: "Yıllık Trentino ulaşım kartı: 50€ (Öğrenci)",
    transportCostEn: "Annual Trentino student transit pass: €50",
    transportDetails: "Mükemmel işleyen temiz otobüs hatları ve dağlık bölgelere çıkan teleferikler. Yıllık öğrenci kartıyla tüm Trentino eyaletindeki trenler ve otobüsler ücretsizdir. Verona ve Bolzano şehirlerine trenle 45-50 dakikadır.",
    transportDetailsEn: "Superb, pristine bus network and mountain cable cars. The annual €50 student pass grants unlimited free access to all trains and buses across the entire Trentino province. Verona and Bolzano are 45-50 mins away via train.",
    climateAndVibe: "Alp iklimi. Kışlar oldukça soğuk, karlı ve kayak yapmaya elverişlidir. Yazlar serin ve temiz dağ havasıyla doludur. İtalya'nın en yüksek yaşam kalitesine, en temiz sokaklarına ve en iyi organize olmuş kamu hizmetlerine sahip şehridir. Doğa sporları, doğa yürüyüşü ve kayak tutkunları için bir cennettir.",
    climateAndVibeEn: "Alpine climate. Cold, snowy winters perfect for skiing; fresh, breezy summers with crisp mountain air. Officially ranked as Italy's top city for quality of life, public safety, and pristine environmental standards. A paradise for outdoor sports and hiking.",
    editorialTip: "Doğa ile iç içe, düzenli ve huzurlu bir eğitim hayatı arayanlar için İtalya'daki en kusursuz seçenektir. Yıllık 50€'luk kartınızı alır almaz tüm eyaleti (Garda Gölü dahil) trenle keşfetmeye başlayın.",
    editorialTipEn: "The ultimate choice for students seeking a highly organized, safe, and nature-surrounded lifestyle. Grab your €50 annual card immediately and explore the entire province, including Lake Garda, for free."
  }
];

export function getCityDetailBySlug(slug: string): CityDetail | undefined {
  const normalized = slug.toLowerCase().trim();
  return CURATED_CITIES.find((c) => c.slug === normalized);
}

export function getCityDetailByName(name: string): CityDetail | undefined {
  const normalized = name.toLowerCase().trim();
  return CURATED_CITIES.find(
    (c) =>
      c.name.toLowerCase().trim() === normalized ||
      c.nameEn.toLowerCase().trim() === normalized ||
      c.slug === normalized
  );
}

export function getFallbackCityDetail(cityName: string, universityCount: number, regionName: string): CityDetail {
  const slug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    slug,
    name: cityName,
    nameEn: cityName,
    region: regionName,
    costRating: 3,
    studentPopulation: "Orta",
    studentPopulationEn: "Medium",
    rentAverage: "Tek kişilik oda: 300€ - 450€ | Stüdyo: 500€ - 750€",
    rentAverageEn: "Single room: €300 - €450 | Studio: €500 - €750",
    livingExpenses: "Aylık 220€ - 300€ (Sakin yerel mutfak alışverişi)",
    livingExpensesEn: "€220 - €300 monthly (Local grocery and student dining)",
    transportCost: "Aylık kart: 20€ - 30€",
    transportCostEn: "Monthly pass: €20 - €30",
    transportDetails: "Şehir içi otobüs hatları ve yerel banliyö trenleri mevcuttur.",
    transportDetailsEn: "Local bus lines and regional train networks serve the city.",
    climateAndVibe: `${cityName}, İtalya'nın ${regionName} bölgesinde yer alan, ${universityCount} üniversiteye ev sahipliği yapan tarihi bir şehirdir. Sakin, güvenli ve otantik bir İtalyan yaşam deneyimi sunar.`,
    climateAndVibeEn: `${cityName} is a historic Italian city located in the ${regionName} region, hosting ${universityCount} university. It offers a peaceful, secure, and highly authentic Italian living experience.`,
    editorialTip: "Bu şehir için editoryal detaylar henüz tasarım aşamasındadır. Şehirdeki üniversiteleri ve bölgeye ait resmi burs detaylarını haritamız üzerinden hemen inceleyebilirsiniz.",
    editorialTipEn: "Editorial details for this city are currently under development. You can explore the active universities and check regional scholarship thresholds immediately."
  };
}
