import type { TieredCityRecord } from "@/types/cities";

export const TIERED_CITY_RECORDS = [
  {
    slug: "aosta",
    name: "Aosta",
    nameEn: "Aosta",
    cityNameIt: "Aosta",
    altNames: ["Aosta", "Aoste", "Aoûta"],
    region: "Valle d'Aosta",
    placeHierarchy: "city",
    costTier: "high",
    costCluster: "alpine-premium",
    costTierRationale:
      "Alpine regional capital with a small housing market, bilingual administrative role, and mountain-tourism pressure that typically keeps student costs above mid-tier provincial cities.",
    historyShort:
      "Aosta, Roma öncesinde Salassi halkının önemli merkezlerinden biriydi. Romalılar MÖ 25'te bölgeyi ele geçirip Augusta Praetoria Salassorum kolonisini kurarak kenti Alp geçitlerini denetleyen askeri ve idari bir üs haline getirdi. Batı Roma'nın çöküşünden sonra farklı krallıkların eline geçen şehir, Orta Çağ'da Via Francigena üzerindeki konumu sayesinde yeniden önem kazandı.",
    historyShortEn:
      "Before Rome, Aosta was one of the main centers of the Salassi people. After conquering the area in 25 BC, the Romans founded Augusta Praetoria Salassorum and turned it into a military and administrative base controlling Alpine passes. Following the fall of the Western Roman Empire, the city passed through several kingdoms and regained importance in the Middle Ages thanks to its position on the Via Francigena.",
    historySourceTitle: "Aosta - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Aosta",
    transportDetails:
      "Aosta'da günlük hareketlilik kompakt merkez, şehir içi ve banliyö otobüsleri etrafında şekillenir; Arriva'nın 440 hattı ile SVAP'ın kentsel ve banliyö hatları şehir içi omurgayı destekler. Aosta tren istasyonu bölgesel demiryolu erişimi sağlar, Arriva da Aosta'dan Courmayeur, Pont-Saint-Martin ve diğer vadi yerleşimlerine düzenli hatlar işletir. Şehir ayrıca Arriva'nın resmi uzun mesafe otobüsleriyle Torino, Milano ve Malpensa yönüne bağlanır.",
    transportDetailsEn:
      "In Aosta, everyday mobility revolves around the compact center and a mix of urban and suburban buses, with Arriva's line 440 and SVAP's city-area services forming the local backbone. Aosta railway station provides regional rail access, while Arriva runs regular bus links from the city to Courmayeur, Pont-Saint-Martin, and other valley towns. The city also has official Arriva long-distance coach connections toward Turin, Milan, and Malpensa.",
    climateAndVibe:
      "Alplerle çevrili küçük ve düzenli bir bölge başkentidir; kışlar belirgin biçimde soğuk, yazlar ise kuzey ovalarına göre daha kuru ama yine de sıcaktır. Merkez yürünebilir olduğu için günlük hayat pratiktir; tempo sessizdir ve doğa, sınır geçişleri ve açık hava sporları öğrenci yaşamını büyük şehirlerden farklılaştırır.",
    climateAndVibeEn:
      "Aosta is a small, orderly regional capital surrounded by the Alps; winters are clearly colder, while summers are drier than in the northern plains but still warm. The center is walkable and practical for daily life, and the rhythm is quiet, with mountain access, border mobility, and outdoor culture shaping the student experience.",
    transportSourceUrls: [
      "https://aosta.arriva.it/bigliettazione-elettronica/",
      "https://aosta.arriva.it/en/timetables-and-routes/",
      "https://aosta.arriva.it/en/commercial-lines/",
      "https://www.trenitalia.com/it/regionale/valle-d-aosta/stazioni-servite-da-trenitalia-valle-d-aosta.html",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: ["bilingual-name"],
    uncertain: [],
  },
  {
    slug: "bergamo",
    name: "Bergamo",
    nameEn: "Bergamo",
    cityNameIt: "Bergamo",
    altNames: ["Bergamo", "Bèrghem"],
    region: "Lombardia",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "metro-satellite",
    costTierRationale:
      "Large and well-connected Lombardy city in the Milan orbit, but still generally more attainable for students than the region's top-priced metro hubs.",
    historyShort:
      "Bergamo'nun çekirdeği Demir Çağı'nda Orobii tarafından yerleşildi, ardından Cenomani egemenliğine girdi ve MÖ 49'da Roma belediyesi Bergomum oldu. Geç Antik Çağ'daki yıkımların ardından şehir, Lombard döneminde kuzey İtalya'nın önemli düklük merkezlerinden birine dönüştü. Daha sonra Orta Çağ komünü olarak güçlendi ve Venedik yönetimi altında bugün hâlâ hissedilen surlu üst şehir kimliğini kazandı.",
    historyShortEn:
      "Bergamo's earliest core was settled in the Iron Age by the Orobii, later passed to the Cenomani, and became the Roman municipality of Bergomum in 49 BC. After late-antique destruction, the city emerged as one of the major Lombard duchy centers in northern Italy. It later grew as a medieval commune and, under Venetian rule, took on the walled upper-city identity that still defines it today.",
    historySourceTitle: "Bergamo - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Bergamo",
    transportDetails:
      "Bergamo'da ATB ağı, 29 belediyeyi kapsayan kentsel alan içinde otobüsleri, iki funiküleri ve T1 Bergamo-Albino tramvayını birlikte işletir. Günlük öğrenci rotalarında istasyon, aşağı şehir ve Città Alta arasında bağlantı kurmak rahattır. ATB'nin Airport Bus hizmeti de Bergamo İstasyonu üzerinden BGY havalimanını merkeze bağlar.",
    transportDetailsEn:
      "In Bergamo, the ATB network combines buses, two funiculars, and the T1 Bergamo-Albino tramway across an urban area covering 29 municipalities. For students, it is straightforward to connect the station, lower town, and Citta Alta in daily routines. ATB's Airport Bus also links BGY airport with the city center via Bergamo station.",
    climateAndVibe:
      "Yazları sıcak ve nemli, kışları serin geçen tipik kuzey İtalya iklimi görülür. Città Alta'nın tarihi yokuşları ile aşağı kentteki daha işlevsel mahalleler arasında iki katmanlı bir şehir hissi vardır; Milano'ya yakınlık fırsat yaratır ama günlük ritim daha yerel ve daha sakindir.",
    climateAndVibeEn:
      "Bergamo has a typical northern Italian pattern with warm, humid summers and cool winters. The city feels distinctly layered between the historic slopes of Citta Alta and the more practical lower-town neighborhoods; proximity to Milan creates opportunities, but the day-to-day rhythm remains more local and calmer.",
    transportSourceUrls: [
      "https://www.atb.bergamo.it/en/public-transport",
      "https://www.atb.bergamo.it/en/other-services/tourist-services",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "brescia",
    name: "Brescia",
    nameEn: "Brescia",
    cityNameIt: "Brescia",
    altNames: ["Brescia", "Brèsa"],
    region: "Lombardia",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Large independent provincial center with strong services and transit, but usually without the sustained rental premium seen in Milan-scale or alpine/tourism-heavy markets.",
    historyShort:
      "Brescia çevresinde Tunç Çağı'na uzanan yerleşim izleri bulunur; şehir Galya Cenomani'nin merkezi olduktan sonra MÖ 225'te Roma ile ittifak kurarak Brixia adıyla Roma dünyasına dahil oldu. Augustus döneminde kolonileşen kentte tapınaklar, tiyatro ve su kemeri gibi önemli yapılar gelişti. 6. yüzyılda Lombardların önemli bir düklüğü haline gelen Brescia, daha sonra Karolenj ve komün dönemlerinden geçerek kuzey İtalya'nın kalıcı kent merkezlerinden biri oldu.",
    historyShortEn:
      "The Brescia area shows settlement traces going back to the Bronze Age; after becoming a center of the Gallic Cenomani, the city entered the Roman world as Brixia in 225 BC through alliance with Rome. Under Augustus it developed as a colony with major structures such as temples, a theater, and an aqueduct. In the 6th century it became an important Lombard duchy and later passed through Carolingian and communal phases to remain one of northern Italy's enduring urban centers.",
    historySourceTitle: "Brescia - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Brescia",
    transportDetails:
      "Brescia'da ana omurga, kenti kuzeyden güneydoğuya kesen tek metro hattıdır; hat Stazione FS ve tarihi merkez dahil 17 durakla çalışır. Buna ek olarak 16 otobüs hattı ve çevredeki 14 belediyeye uzanan ağ günlük kampüs ve mahalle hareketliliğini tamamlar. Bu yapı, merkezde yürüyüşü toplu taşımayla kolayca birleştiren orta ölçekli bir şehir düzeni sunar.",
    transportDetailsEn:
      "In Brescia, the main backbone is a single metro line running across the city from north to southeast, including Stazione FS and the historic center among its 17 stops. On top of that, 16 bus lines and links to 14 neighboring municipalities complete everyday campus and neighborhood mobility. The result is a medium-sized city where walking in the center combines easily with public transport.",
    climateAndVibe:
      "Yazları sıcak ve bunaltıcı, kışları serin ve zaman zaman sisli bir Lombardiya iklimi vardır. Tarihi merkez, modern mahalleler ve güçlü üretim-ekonomi ağı iç içe geçtiği için şehir hem yerel hem hareketli hissedilir; öğrenci yaşamı Milano'dan daha az kaotik ama canlı kalır.",
    climateAndVibeEn:
      "Brescia has a Lombardy climate with hot, sometimes muggy summers and cool winters that can turn foggy. Its historic core, modern districts, and strong industrial economy sit close together, so the city feels both local and active; student life is less chaotic than Milan but still lively.",
    transportSourceUrls: [
      "https://www.brescia.eu/en/come-muoversi",
      "https://www.bresciamobilita.it/en/metro/maps",
      "https://www.bresciamobilita.it/en/maps",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "bolzano",
    name: "Bolzano/Bozen",
    nameEn: "Bolzano/Bozen",
    cityNameIt: "Bolzano",
    altNames: ["Bolzano/Bozen", "Bolzano", "Bozen", "Bozen-Bolzano"],
    region: "Trentino-Alto Adige",
    placeHierarchy: "city",
    costTier: "high",
    costCluster: "alpine-premium",
    costTierRationale:
      "Bolzano/Bozen is a provincial capital in high-income South Tyrol, and its alpine setting plus bilingual regional-hub demand justify the high band.",
    historyShort:
      "Bolzano/Bozen, Adige, Isarco ve Talvera vadilerinin birleştiği noktada büyüdüğü için Orta Çağ'da Brenner ve Via Claudia Augusta güzergahlarının önemli ticaret duraklarından birine dönüştü. Yüzyıllarca Tirol ve Avusturya siyasal-kültürel alanında kaldı, I. Dünya Savaşı'nın ardından İtalya'ya bağlandı. 20. yüzyılda sanayileşme ve idari rolünün büyümesiyle daha büyük ve daha karma bir kent kimliği kazandı.",
    historyShortEn:
      "Because it grew where the Adige, Isarco, and Talvera valleys meet, Bolzano/Bozen became an important medieval trading stop on the Brenner and Via Claudia Augusta routes. It remained for centuries within the Tyrolean and Austrian political-cultural sphere before being annexed to Italy after the First World War. In the twentieth century, industrial growth and its expanding administrative role gave it a larger and more mixed urban identity.",
    historySourceTitle: "Bolzano (English Wikipedia)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Bolzano",
    transportDetails:
      "Bolzano/Bozen'de ulaşım, altoadigemobilita sistemi içindeki şehir ve banliyö otobüsleri, yerel trenler ve ana teleferik/füniküler bağlantıları etrafında kurulur. Belediye, bölgesel ağın şehir otobüsleri, yerel ve bölgesel trenler, Mendola füniküleri, Renon treni ve çeşitli teleferiklerle entegre çalıştığını; SASA'nın da Bolzano çevresindeki ana otobüs işletmecisi olduğunu belirtir. Merkez ve istasyon çevresi yürünebilir olsa da çevre mahalleler ve yamaç yerleşimleri için toplu taşıma günlük yaşamın temel parçasıdır.",
    transportDetailsEn:
      "Mobility in Bolzano/Bozen is built around the altoadigemobilita network of urban and suburban buses, local trains, and key cable-car or funicular links. The municipality describes an integrated system that combines city buses, local and regional trains, the Mendola funicular, the Renon train, and several cable cars, while SASA is the main bus operator around Bolzano. The centre and station area are walkable, but public transport is a core part of daily life for outer neighborhoods and hillside settlements.",
    climateAndVibe:
      "Alp vadisindeki konumu nedeniyle kışlar serin-soğuk, yazlar ise güneşli ve zaman zaman sıcak geçebilir. Tarihi merkez kompakt, sokakta hem İtalyanca hem Almanca duymak normal ve öğrenci hayatı şehir ile dağ bağlantıları arasında gidip gelen düzenli bir ritme sahiptir.",
    climateAndVibeEn:
      "Its Alpine valley setting brings cool to cold winters and sunny summers that can still get quite warm. The historic centre is compact, hearing both Italian and German is normal in daily life, and the student rhythm often moves between the city and nearby mountain connections.",
    transportSourceUrls: [
      "https://www.comune.bolzano.bz.it/Amministrazione/Documenti-e-dati/Documenti-tecnici-di-supporto/Spostarsi-a-Bolzano-con-i-mezzi-pubblici",
      "https://www.sasabz.it/it/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: ["bilingual-name"],
    uncertain: [],
  },
  {
    slug: "castellanza",
    name: "Castellanza",
    nameEn: "Castellanza",
    cityNameIt: "Castellanza",
    altNames: ["Castellanza", "Castelànza"],
    region: "Lombardia",
    placeHierarchy: "satellite-town",
    costTier: "balanced",
    costCluster: "metro-satellite",
    costTierRationale:
      "Castellanza sits in the Milan-Malpensa commuter corridor, so housing pressure is higher than a standalone micro-town but usually lower than core Milan, which fits the balanced band.",
    historyShort:
      "Bugünkü Castellanza, Olona'nın iki yakasındaki Castellanza ve Castegnate çekirdeklerinden oluşur; Galya-Roma nekropolü ve Roma yolu izleri nedeniyle yerleşim kökleri antik döneme uzanır. Orta Çağ boyunca Seprio ve ardından Milano Dükalığı çevresindeki yerel güç ilişkileri içinde gelişen yerleşim, 1869'da Castellanza ile Castegnate Olona belediyelerinin birleşmesiyle bugünkü idari biçimini aldı. 19. yüzyılın sonlarında Cantoni, Turati/Tosi ve Pomini gibi tesislerle belirgin bir sanayi kasabasına dönüştü.",
    historyShortEn:
      "Present-day Castellanza grew from the two nuclei of Castellanza and Castegnate on opposite sides of the Olona, and its roots reach back to antiquity through Gallo-Roman finds and the traces of a Roman road. During the Middle Ages it developed within the political orbit of Seprio and then the Duchy of Milan, before taking its current administrative form in 1869 through the merger of Castellanza and Castegnate Olona. By the late nineteenth century it had become a clearly industrial town with plants such as Cantoni, Turati/Tosi, and Pomini.",
    historySourceTitle: "Castellanza (Italian Wikipedia)",
    historySourceUrl: "https://it.wikipedia.org/wiki/Castellanza",
    transportDetails:
      "Castellanza'da günlük hareketlilik, via Morelli'deki Trenord istasyonu ile STIE ve FNMAutoservizi hatları etrafında şekillenir. Belediye, kentin Milano-Saronno-Novara ve Malpensa koridorundaki demiryolu bağlantılarına, Sempione eksenindeki otobüslere ve istasyonu LIUC ile başlıca kent noktalarına bağlayan yerel kentsel servise sahip olduğunu belirtir. Bu bağlantılar, istasyon ve otobüs duraklarının LIUC ile başlıca kent noktalarına erişimdeki rolünü belirginleştirir.",
    transportDetailsEn:
      "Daily mobility in Castellanza revolves around the Trenord station on via Morelli together with STIE and FNMAutoservizi bus links. The municipality states that the town has rail connections on the Milan-Saronno-Novara and Malpensa corridors, buses along the Sempione axis, and a local urban service that links the station with LIUC and the city's main destinations. These links make the role of the station and bus stops in access to LIUC and the town's main destinations clear.",
    climateAndVibe:
      "Po Ovası'nın nemli iklimi nedeniyle yazlar sıcak ve bunaltıcı, kışlar ise sisli ve nemli hissedilebilir. Ölçek küçük ve pratiktir; günlük ritim büyük ölçüde tren, otobüs ve komşu merkezlere bağlantılar etrafında şekillendiği için daha sakin bir öğrenci üssü arayanlara uygundur.",
    climateAndVibeEn:
      "With the humid climate of the Po plain, summers can feel hot and sticky while winters are often damp and foggy. The scale is small and practical, and daily life is shaped heavily by rail, bus, and neighboring-centre connections, which suits students looking for a quieter base.",
    transportSourceUrls: [
      "https://www.comune.castellanza.va.it/servizi/turismo/la-citta/trasporti/",
      "https://www.comune.castellanza.va.it/servizi/turismo/la-citta/trasporto-pubblico-urbano/",
      "https://www.liuc.it/chi-siamo/come-raggiungerci/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: ["satellite-town"],
    uncertain: [
      "No official source reviewed here states a single dominant off-campus residential base for LIUC students, so primaryStudentBase is intentionally omitted.",
    ],
  },
  {
    slug: "udine",
    name: "Udine",
    nameEn: "Udine",
    cityNameIt: "Udine",
    altNames: ["Udine", "Udin", "Videm"],
    region: "Friuli-Venezia Giulia",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "regional-capital",
    costTierRationale:
      "Udine has the service depth and administrative role of a regional capital, but its housing pressure is still meaningfully below Italy's largest and premium university metros, so it fits the balanced band.",
    historyShort:
      "Udine, Neolitik çağdan beri yerleşim gören tarihi Friuli merkezidir ve adı 983 tarihli bir belgede ilk kez geçer. 13. yüzyılda Aquileia Patriklerinin önemli yerleşimlerinden biri ve bölgenin başlıca pazar kenti haline geldi. 1420'den 1797'ye kadar Venedik yönetiminde kaldı; ardından Habsburg egemenliğinden geçerek 1866'da İtalya Krallığı'na katıldı.",
    historyShortEn:
      "Udine is the historic centre of Friuli and has been inhabited since the Neolithic age; its name first appears in a document from 983. In the thirteenth century it became one of the key residences of the Patriarchs of Aquileia and the area's main market city. It stayed under Venetian rule from 1420 to 1797, then passed through Habsburg control before joining the Kingdom of Italy in 1866.",
    historySourceTitle: "Udine (English Wikipedia)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Udine",
    transportDetails:
      "Udine'de Arriva Udine/TPL FVG ağı, istasyondan geçen 12 kentsel hatla şehir ve yakın çevreyi birbirine bağlar. Resmî ağda Linea 10 doğrudan 'Università-S. Domenico' koridorunu gösterdiği için üniversite odaklı günlük rotalar çoğunlukla otobüs ve yürüyüş kombinasyonuna dayanır. Ana istasyon ve otogar, hem şehir içi hareketin hem de Friuli geneline uzanan ekstraurbana çıkışın temel düğümüdür.",
    transportDetailsEn:
      "In Udine, the Arriva Udine/TPL FVG network connects the city and nearby municipalities through 12 urban lines that pass through the railway station. The official network explicitly lists Line 10 as the 'Università-S. Domenico' corridor, so university-focused daily routes usually rely on a bus-and-walk combination. The main station and bus terminal are the key nodes for both local mobility and extra-urban travel across Friuli.",
    climateAndVibe:
      "Kuzeydoğu ovasında olduğu için yazlar sıcak ve nemli, kışlar ise daha soğuk ve yağışlı geçebilir. Tarihi merkez yürünebilir ve şehir büyük metropollere göre daha sakin hissettirir; üniversite birimleri kentin farklı noktalarına yayıldığı için otobüs hatları ve istasyon erişimi kampüs erişimini şekillendirir.",
    climateAndVibeEn:
      "Its position on the northeastern plain brings hot, humid summers and colder, wetter winters. The historic centre is walkable and calmer than the biggest Italian metros, while university sites are spread across different parts of the city, so bus lines and station access shape access between them.",
    transportSourceUrls: [
      "https://www.arrivaudine.it/en/urbani-extraurbani/",
      "https://www.uniud.it/en/education/information/contacts-details",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "perugia",
    name: "Perugia",
    nameEn: "Perugia",
    cityNameIt: "Perugia",
    altNames: ["Perugia"],
    region: "Umbria",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "regional-capital",
    costTierRationale:
      "Umbria'nın bölge başkenti ve çok kampüslü bir üniversite merkezi olduğu için günlük hizmet ve konut piyasası mikro kampüs kasabalarından daha pahalıdır, ancak Roma, Floransa veya Milano düzeyinde premium baskı taşımaz.",
    historyShort:
      "Perugia, önce Umbri yerleşimi olarak gelişti ve sonra Etrüsk dünyasının başlıca kentlerinden biri olan Perusia'ya dönüştü. Roma ile çatışma ve ittifak dönemlerinden geçtikten sonra Orta Çağ'da güçlü bir komün olarak öne çıktı. Bugünkü şehir kimliği, bu eski tepe yerleşiminin papalık dönemi ve modern Umbria başkenti rolüyle birleşmesinden doğdu.",
    historyShortEn:
      "Perugia first grew as an Umbrian settlement and later became Perusia, one of the leading cities of the Etruscan world. After periods of conflict and alliance with Rome, it emerged in the Middle Ages as a strong self-governing commune. Its present identity comes from that ancient hilltop city combined with its papal-era legacy and its role as the modern capital of Umbria.",
    historySourceTitle: "Perugia - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Perugia",
    transportDetails:
      "Perugia'da günlük ulaşım, Busitalia'nın kentsel otobüs ağı ile Minimetrò'nun birlikte çalıştığı bir sistem üzerine kuruludur. Minimetrò, Pian di Massiano'dan Fontivegge ve Pincetto üzerinden tarihi merkeze tırmanışı kolaylaştırır; belediye de otobüslerin üniversite alanları, mahalleler ve istasyon arasında çalıştığını belirtir. UNIPG'nin Umbria Vai anlaşması ise öğrencilerin Busitalia'nın Umbria yerel toplu taşıma ağını tek pass ile kullanabildiğini gösterir.",
    transportDetailsEn:
      "Daily mobility in Perugia relies on Busitalia's urban bus network working together with the Minimetrò. The Minimetrò makes the climb from Pian di Massiano through Fontivegge and Pincetto to the historic center easier, and the municipality notes that buses connect the university areas, neighborhoods, and the station. UniPG's Umbria Vai agreement also shows that students can use Busitalia's local public transport network across Umbria with a single pass.",
    climateAndVibe:
      "Perugia yüksek bir tepeye yayıldığı için merkezde yürüyüş, merdiven ve yokuş günlük hayatın parçasıdır; alt mahalleler ise daha modern ve yayılmıştır. İklim iç kesim karakteri taşır: yazlar sıcak, kışlar serin geçer. Bölge başkenti olduğu için öğrenci hayatı küçük kasabalara göre daha canlı ama büyük metropollere göre daha yönetilebilirdir.",
    climateAndVibeEn:
      "Because Perugia spreads across a high hill, daily life in the center involves walking, stairs, and steep streets, while the lower districts feel more modern and spread out. The climate is inland, with warm summers and cooler winters. As a regional capital, student life is livelier than in small towns but still more manageable than in Italy's biggest metros.",
    transportSourceUrls: [
      "https://www.unipg.it/didattica/agevolazione-trasporto-pubblico",
      "https://www.minimetrospa.it/",
      "https://www.comune.perugia.it/sapere-perugia/",
      "https://www.fsbusitalia.it/it/umbria/titoli-di-viaggio-tariffe-umbria/biglietti-tariffe-servizi-urbani-umbria/tariffe-perugia.html",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "camerino",
    name: "Camerino",
    nameEn: "Camerino",
    cityNameIt: "Camerino",
    altNames: ["Camerino"],
    region: "Marche",
    placeHierarchy: "city",
    costTier: "budget",
    costCluster: "micro-campus-town",
    costTierRationale:
      "Küçük, iç kesimdeki üniversite kasabası yapısı ve sınırlı metropol baskısı Camerino'yu ItalyPath'in en ekonomik öğrenci bantına yerleştirir; maliyet baskısı daha çok erişim ve eğimli topoğrafyadan gelir, büyük şehir primi taşımaz.",
    historyShort:
      "Camerino, antik Camerinum'un bulunduğu yerde kuruldu ve erken dönemde Roma ile eşit statülü bir ittifaka bağlandı. Orta Çağ'da bağımsız bir komün olarak güç kazandı, ardından Da Varano hanedanı altında uzun süreli bir yerel beyliğe dönüştü. 16. yüzyılda doğrudan Papalık yönetimine geçmesiyle siyasi ağırlığı azalsa da üniversite kenti kimliği kaldı.",
    historyShortEn:
      "Camerino stands on the site of ancient Camerinum and entered an early alliance with Rome under an equal treaty. In the Middle Ages it grew into an independent commune and then into a long-lasting local lordship under the Da Varano family. Its political weight declined after direct papal control in the sixteenth century, but its identity as a university town remained.",
    historySourceTitle: "Camerino - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Camerino",
    transportDetails:
      "Camerino'da öğrenci hareketliliği büyük ölçüde UNICAM ile Contram'ın birlikte işlettiği otobüsler üzerine kuruludur. Üniversite, UNICAM Mobilità kartının Camerino kent içi hatlarıyla Camerino-Castelraimondo ve Camerino-Matelica bağlantılarında kullanılabildiğini; ayrıca çeşitli şehirlerden gelen UNICAM Bus servisleri bulunduğunu açıkça belirtir. Resmî uluslararası bilgilendirme sayfası da Castelraimondo/Camerino istasyonuna gelen trenlerin şehir merkezine otobüs bağlantısıyla bağlandığını söylüyor.",
    transportDetailsEn:
      "Student mobility in Camerino depends largely on bus services run through the UniCAM and Contram partnership. The university states that the UNICAM Mobilità card can be used on urban routes in Camerino as well as the Camerino-Castelraimondo and Camerino-Matelica links, and that dedicated UNICAM Bus services reach the town from multiple cities. The university's international travel page also says trains arriving at Castelraimondo/Camerino station connect to the town center by bus.",
    climateAndVibe:
      "Camerino Apenninler üzerinde küçük ve sessiz bir tepe şehridir; kışlar daha soğuk, günlük tempo ise belirgin biçimde yavaştır. Öğrenci yaşamı büyük ölçüde üniversite çevresinde yoğunlaşır ve şehir, sosyal çeşitlilikten çok odaklı kampüs rutini sunar. Yürünebilir ölçeği avantajdır, ancak bölgesel erişim için otobüs bağlantıları önemlidir.",
    climateAndVibeEn:
      "Camerino is a small, quiet hill town in the Apennines, with colder winters and a noticeably slower daily rhythm. Student life is concentrated around the university and feels more campus-focused than socially varied. Its walkable scale is a plus, but regional mobility matters because bus links are central to getting around.",
    transportSourceUrls: [
      "https://www.unicam.it/futuro-studente/vivere-unicam/trasporti",
      "https://international.unicam.it/services/maps-and-travel",
      "https://www.contram.it/index.php/unicam-mobilita/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "urbino",
    name: "Urbino",
    nameEn: "Urbino",
    cityNameIt: "Urbino",
    altNames: ["Urbino", "Urbìn"],
    region: "Marche",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "tourism-heavy",
    costTierRationale:
      "UNESCO mirası ve turizm baskısı konut piyasasını benzer iç kesim kasabalarına göre sıkılaştırır, ancak Urbino'nun ölçeği ve öğrenci odaklı yapısı onu Floransa benzeri yüksek maliyet bandına değil dengeli banda yerleştirir.",
    historyShort:
      "Urbino, önce mütevazı bir Roma yerleşimiyken 6. yüzyıldaki savaşlarda stratejik bir kaleye dönüştü. Montefeltro hanedanı ve özellikle Federico da Montefeltro döneminde Rönesans kültürünün en parlak saray kentlerinden biri oldu. Dükalık sarayının ve sanat koruyuculuğunun bıraktığı miras, bugün şehrin tarihi merkezini tanımlayan ana katmandır.",
    historyShortEn:
      "Urbino began as a modest Roman settlement and became a strategic stronghold during the wars of the sixth century. Under the Montefeltro family, and especially Federico da Montefeltro, it turned into one of the brightest court cities of the Renaissance. The legacy of that ducal court and its artistic patronage still defines the historic center today.",
    historySourceTitle: "Urbino - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Urbino",
    transportDetails:
      "Urbino'ya gelişte ana düzen, Pesaro tren istasyonundan kalkan 46 numaralı otobüs ve Adriabus'un işlettiği bölgesel hatlar üzerinden kuruludur. Üniversite, kent merkezinden yurtlara 1 ve 3 numaralı kentsel hatların çalıştığını ve öğrenci ulaşım işlemleri için Park Santa Lucia terminalini işaret eder. Bu yüzden şehir içi yaşam otobüs temelli, hafta sonu şehirler arası hareket ise çoğunlukla Pesaro bağlantısına bağlıdır.",
    transportDetailsEn:
      "The main access pattern for Urbino is the Line 46 bus from Pesaro railway station together with regional routes run by Adriabus. The university states that urban lines 1 and 3 connect the old town center with the halls of residence, and points students to the Park Santa Lucia terminal for travel arrangements. In practice, daily mobility is bus-based, while many intercity weekend trips depend on the Pesaro connection.",
    climateAndVibe:
      "Urbino'nun tarihi merkezi dik yokuşlu ve çok kompaktır; günlük hayat görsel olarak etkileyici ama sürekli yürüyüş gerektirir. İç kesim tepe konumu nedeniyle kışlar serin, yazlar sıcak geçer. Şehir küçük olduğu için öğrenci hayatı dağılmak yerine merkez, yurtlar ve üniversite yapıları etrafında yoğunlaşır.",
    climateAndVibeEn:
      "Urbino's historic center is steep and very compact, so daily life is visually striking but involves constant walking. Its inland hilltop position brings cooler winters and warm summers. Because the city is small, student life stays concentrated around the center, the residences, and university buildings rather than spreading widely.",
    transportSourceUrls: [
      "https://www.uniurb.it/international/welcome-to-urbino/about-urbino",
      "https://www.uniurb.it/international/welcome-to-urbino/about-urbino/bus-transport-in-urbino",
      "https://www.adriabus.eu/en/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "cagliari",
    name: "Cagliari",
    nameEn: "Cagliari",
    cityNameIt: "Cagliari",
    altNames: ["Cagliari", "Casteddu"],
    region: "Sardegna",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "island-premium",
    costTierRationale:
      "Sardinya'nın idari merkezi ve deniz kıyısındaki ana hizmet şehri olması maliyet tabanını ada içi küçük merkezlerin üstüne çıkarır; yine de öğrenci bütçesi baskısı İtalya'nın en pahalı büyük metropolleri kadar yüksek görünmediği için denge bandı daha uygundur.",
    historyShort:
      "Cagliari'nin kökleri antik Karalis'e uzanır; Fenike-Pön döneminde gelişen yerleşim Roma çağında önemli bir liman ve ada merkezi oldu. Orta Çağ'da yargı krallığı ve ardından Pisa etkisi altında yeniden şekillendi, Aragon ve İspanyol dönemlerinde ise güçlü surlarla Sardinya'nın başlıca yönetim kentlerinden birine dönüştü. Bugünkü şehir kimliği de bu çok katmanlı Akdeniz geçmişi ile modern bölgesel başkent rolünün birleşiminden geliyor.",
    historyShortEn:
      "Cagliari's roots go back to ancient Karalis; the settlement grew in the Phoenician-Punic era and became an important port and island center under Rome. In the Middle Ages it was reshaped through the local giudicato and then Pisan influence, before Aragonese and Spanish rule turned it into one of Sardinia's main fortified administrative cities. Its present identity still combines that layered Mediterranean past with its role as the modern regional capital.",
    historySourceTitle: "Cagliari - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Cagliari",
    transportDetails:
      "Cagliari'de günlük ulaşımın omurgasını CTM'nin şehir ve hinterland ağı oluşturur; sistem Cagliari ile Monserrato, Quartu Sant'Elena, Selargius, Elmas ve diğer yakın belediyeleri birlikte kapsar. UniCa'nın CTM ile yaptığı çalışma da kampüslere erişimde özellikle 5, 8, 10, 29 ve University Express hatlarının öne çıktığını gösteriyor. Öğrenciler şehir içi otobüsleri MetroCagliari ile birleştirerek özellikle Monserrato yönündeki üniversite alanlarına ulaşabiliyor.",
    transportDetailsEn:
      "Daily mobility in Cagliari is built around CTM's urban and hinterland network, which covers Cagliari together with nearby municipalities such as Monserrato, Quartu Sant'Elena, Selargius, and Elmas. UniCa's collaboration with CTM also shows that lines 5, 8, 10, 29, and the University Express are especially relevant for reaching university sites. Students can combine city buses with MetroCagliari for access, especially toward the Monserrato university area.",
    climateAndVibe:
      "Cagliari belirgin Akdeniz iklimine sahip: yazlar sıcak ve kurak, kışlar yumuşak geçer. Liman, tepe mahalleleri ve Poetto ekseni arasında yaşayan bir kıyı başkenti olduğu için küçük bir üniversite kasabasından daha hareketli ama büyük kuzey metropollerinden daha gevşek bir ritim sunar.",
    climateAndVibeEn:
      "Cagliari has a clear Mediterranean pattern, with hot dry summers and mild winters. Because it is a coastal capital spread between the port, hillside districts, and the Poetto axis, it feels livelier than a small university town but still more relaxed than Italy's biggest northern metros.",
    transportSourceUrls: [
      "https://www.ctmcagliari.it/en/",
      "https://www.unica.it/it/servizi/servizi-agli-studenti/accordo-tra-unica-e-ctm",
      "https://www.arstspa.info/cardarst.html",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "sassari",
    name: "Sassari",
    nameEn: "Sassari",
    cityNameIt: "Sassari",
    altNames: ["Sassari"],
    region: "Sardegna",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Sassari büyük bir üniversite ve hizmet merkezi olduğu için mikro kampüs kasabalarından daha yüksek bir konut ve günlük yaşam tabanı taşır; buna karşılık ada başkenti veya kuzey İtalya'nın premium merkezleri kadar baskılı olmadığı için dengeli bant daha savunulabilir.",
    historyShort:
      "Sassari erken Orta Çağ'da ortaya çıktı ve çevredeki yerleşimlerin birleşmesiyle 13. yüzyıla gelindiğinde Torres yargı krallığının en önemli kentlerinden biri haline geldi. Sonrasında Pisa ve ardından Aragon etkisine girdi, fakat kendi komün geleneğini ve kent hukukunu uzun süre korudu. Modern dönemde ise idari, hizmet ve üniversite işlevleri şehrin karakterini belirlemeye devam etti.",
    historyShortEn:
      "Sassari emerged in the early Middle Ages and, through the merger of nearby settlements, became one of the main urban centers of the Giudicato of Torres by the thirteenth century. It later moved under Pisan and then Aragonese influence, while preserving a strong communal tradition and its own civic statutes for a long period. In the modern era, administrative, service, and university functions continued to shape the city's character.",
    historySourceTitle: "Sassari - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Sassari",
    transportDetails:
      "Sassari'de öğrenci hareketliliği büyük ölçüde ATP'nin işlettiği kentsel ve banliyö otobüs ağına dayanır. Resmî ağ sayfaları, merkez, FS istasyonu, Piandanna ve dış mahalleler arasında düzenli hatlar bulunduğunu; yeni kurumsal duyurular da viale Italia ve hastane-üniversite koridorunun özel bir hareketlilik odağı olduğunu gösteriyor. UNISS ile ERSU'nun ATP anlaşmaları da otobüsün şehirde öğrenciler için temel ulaşım aracı olduğunu doğruluyor.",
    transportDetailsEn:
      "Student mobility in Sassari depends mainly on ATP's urban and suburban bus network. The official network pages show regular links between the center, the FS station, Piandanna, and outer districts, while newer company communications highlight the viale Italia and hospital-university corridor as a specific mobility focus. UNISS and ERSU agreements with ATP also confirm that the bus system is the core daily transport mode for students in the city.",
    climateAndVibe:
      "Sassari, Cagliari'ye göre daha içte ve daha yüksek bir konumda olduğu için rüzgarı daha hissedilen, kışları biraz daha serin bir Sardinya şehridir. Tarihi merkez kompakt, günlük tempo ise bölgesel başkent kadar yoğun olmayan ama belirgin üniversite ve kamu hizmeti akışına sahip bir orta ölçekli kent hissi verir.",
    climateAndVibeEn:
      "Because Sassari sits further inland and at a higher elevation than Cagliari, it feels windier and a bit cooler in winter. The historic center is compact, and the daily rhythm is that of a mid-sized city with visible university and public-service activity rather than the intensity of a regional capital.",
    transportSourceUrls: [
      "https://atpsassari.it/",
      "https://old.atpsassari.it/pagina/linee",
      "https://www.atpsassari.it/comunicazione/aou-sassari-e-atp-spa-insieme-per-la-mobilita-sostenibile-al-via-la-linea-sperimentale-per-i-dipendenti-dell-azienda-ospedaliero-universitaria-e-aperta-a-tutta-la-cittadinanza",
      "https://www.uniss.it/en/news/public-transport-discounts-uniss-students",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "palermo",
    name: "Palermo",
    nameEn: "Palermo",
    cityNameIt: "Palermo",
    altNames: ["Palermo", "Palermu"],
    region: "Sicilia",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "regional-capital",
    costTierRationale:
      "Palermo büyük bir bölgesel başkent ve geniş bir kentsel pazara sahip olduğu için küçük güney şehirlerinden daha yüksek bir öğrenci bütçesi gerektirir; yine de fiyat baskısı İtalya'nın kuzeydeki en premium metropollerine göre daha sınırlı kaldığından dengeli bant daha isabetlidir.",
    historyShort:
      "Palermo, doğal limanı çevresinde Fenikelilerin kurduğu Ziz yerleşiminden büyüdü ve antik çağ boyunca Akdeniz ticaretinin önemli duraklarından biri oldu. Daha sonra Roma, Bizans, Arap ve Norman yönetimlerinden geçerek Sicilya'nın başlıca siyasal ve kültürel merkezlerinden birine dönüştü. Bugünkü tarihi doku da özellikle bu çok katmanlı kent geçmişinin izlerini taşıyor.",
    historyShortEn:
      "Palermo grew from the Phoenician settlement of Ziz around its natural harbour and became an important stop in Mediterranean trade in antiquity. It later passed through Roman, Byzantine, Arab, and Norman rule, turning into one of Sicily's main political and cultural centers. The city's historic fabric still reflects that layered urban past.",
    historySourceTitle: "Palermo - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Palermo",
    transportDetails:
      "Palermo'da AMAT'ın otobüs ve tramvay ağı şehir geneline yayılır ve belediye, ağın Monreale ile Villabate gibi yakın belediyelere de uzandığını belirtir. Resmî tramvay sayfası, hatların Roccella'yı Stazione Centrale'ye ve kuzeybatı mahallelerini Notarbartolo istasyonuna bağladığını gösteriyor. UniPa'nın Viale delle Scienze kampüsündeki shuttle, Basile düğümü ve metropol tren varışlarıyla kampüs binaları arasında son kilometre bağlantısı sağlıyor.",
    transportDetailsEn:
      "In Palermo, AMAT's bus and tram network extends across the city, and the municipality states that it also reaches nearby municipalities such as Monreale and Villabate. The official tram page shows lines linking Roccella to Stazione Centrale and north-western districts to Notarbartolo station. UniPa's shuttle at the Viale delle Scienze campus also provides the last-mile link between the Basile interchange, metropolitan rail arrivals, and the campus buildings.",
    climateAndVibe:
      "Palermo sıcak ve kurak yazları, yumuşak kışları ve uzun süre açık havada yaşayan gündelik ritmiyle tipik bir büyük Akdeniz kentidir. Tarihi merkez çok yoğun, şehir dokusu geniş ve bazen kaotik olabilir; buna karşılık kültürel hareketlilik, deniz etkisi ve büyük şehir ölçeği öğrenci hayatına daha canlı bir tempo verir.",
    climateAndVibeEn:
      "Palermo is a classic large Mediterranean city, with hot dry summers, mild winters, and a daily rhythm that often stays outdoors for long hours. The historic center is dense and the wider urban fabric can feel chaotic, but the cultural energy, coastal setting, and big-city scale give student life a livelier tempo.",
    transportSourceUrls: [
      "https://www.comune.palermo.it/amministrazione/unita_organizzativa/amat-palermo-spa/",
      "https://www.amat.pa.it/tram/",
      "https://www.unipa.it/Servizio-di-bus-navetta-gratuito-al-Campus-UniPa-/",
      "https://www.unipa.it/Coome-arrivare/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "catania",
    name: "Catania",
    nameEn: "Catania",
    cityNameIt: "Catania",
    altNames: ["Catania", "Katane", "Catana"],
    region: "Sicilia",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "island-premium",
    costTierRationale:
      "Large Sicilian university city with strong airport connectivity and island-market pressure, but still usually more attainable for students than Italy's highest-cost metro hubs.",
    historyShort:
      "Catania, MÖ 8. yüzyılda Kalkisli Yunanlar tarafından kuruldu ve erken dönemden itibaren Sicilya'nın önemli liman kentlerinden biri oldu. Şehrin tarihi 1169 depremi, 1669 Etna püskürmesi ve 1693 depremi gibi büyük felaketlerle birkaç kez kesintiye uğradı. Bugünkü tarihi merkezin belirgin geç barok görünümü, bu son büyük yıkımdan sonraki yeniden inşanın sonucudur.",
    historyShortEn:
      "Catania was founded in the 8th century BC by Chalcidian Greeks and became one of Sicily's major port cities from an early stage. Its history was repeatedly interrupted by major disasters, including the 1169 earthquake, the 1669 eruption of Etna, and the 1693 earthquake. The late-Baroque character of the historic center largely comes from the rebuilding that followed that final destruction.",
    historySourceTitle: "Catania - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Catania",
    transportDetails:
      "Catania'da öğrenci hareketliliğinin omurgasını AMTS otobüsleri ile FCE metrosunun entegre kullanımı oluşturur; Università di Catania da bu şehir içi AMTS/FCE sistemini ve Milo metro istasyonu, Cittadella Universitaria ile Santa Sofia arasında çalışan AMTS Metro Shuttle bağlantısını resmen yönlendirir. AMTS ağındaki 442 hattı Stazione Centrale'yi Città Universitaria'ya bağlar, Alibus ise Fontanarossa Havalimanı ile merkezi birbirine bağlayan temel resmi bağlantıdır.",
    transportDetailsEn:
      "Student mobility in Catania is built around the integrated use of AMTS buses and the FCE metro, and the University of Catania officially directs students to that AMTS/FCE urban system as well as the AMTS Metro Shuttle linking Milo metro station with the Cittadella Universitaria and Santa Sofia. Within the AMTS network, line 442 connects the main station to the university area, while Alibus is the main official link between Fontanarossa Airport and the center.",
    climateAndVibe:
      "Akdeniz iklimi nedeniyle yazlar çok sıcak ve uzun, kışlar ise genelde ılımandır. Deniz, Etna ve yoğun tarihi merkez bir araya geldiği için şehir enerjik ve biraz kaotik hissedilir; öğrenci hayatı merkez, sahil ve üniversite eksenleri arasında hızlı akar.",
    climateAndVibeEn:
      "With its Mediterranean climate, summers are very hot and long while winters are generally mild. The mix of the sea, Etna, and a dense historic core makes the city feel energetic and a little chaotic, and student life moves quickly between the center, the waterfront, and the university zones.",
    transportSourceUrls: [
      "https://www.unict.it/it/servizi/trasporti-e-mobilit%C3%A0",
      "https://www.amts.ct.it/percorsi-e-orari",
      "https://www.circumetnea.it/le-nostre-linee/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "messina",
    name: "Messina",
    nameEn: "Messina",
    cityNameIt: "Messina",
    altNames: ["Messina", "Messana", "Zancle"],
    region: "Sicilia",
    placeHierarchy: "city",
    costTier: "budget",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Strait-side university city with a meaningful port role, but student housing and daily costs are generally softer than Sicily's largest premium markets and fit the entry band.",
    historyShort:
      "Messina, MÖ 8. yüzyılda önce Zancle adıyla ortaya çıktı, ardından Messana adını aldı ve boğaz girişindeki konumu sayesinde hem antik çağda hem de Orta Çağ'da önemli bir liman oldu. Roma dönemindeki öneminin ardından Norman çağında yeniden güç kazandı ve Sicilya'nın başlıca geçiş kentlerinden birine dönüştü. 1908 depremi ise şehrin büyük bölümünü yok ederek bugünkü kentsel dokunun önemli kısmını yeniden şekillendirdi.",
    historyShortEn:
      "Messina first emerged in the 8th century BC as Zancle, later took the name Messana, and became an important port in both antiquity and the Middle Ages because of its position at the entrance to the strait. After its Roman prominence, it rose again in the Norman period and turned into one of Sicily's main gateway cities. The 1908 earthquake destroyed much of the city and reshaped a large part of the urban fabric seen today.",
    historySourceTitle: "Messina - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Messina",
    transportDetails:
      "Messina'da günlük hareketlilik ATM'nin otobüs ve tramvay ağına dayanır; şirket şehir içi otobüsleri ve tramvayı işletirken Università di Messina da ana kampüsler olan Polo Centrale, Policlinico, Annunziata ve Papardo için özel üniversite bağlantılarını resmen listeler. Şehir boğaz boyunca lineer yayıldığı için kuzey-güney koridorları önemlidir; üniversitenin resmî sayfası ayrıca Reggio Calabria ve Villa San Giovanni yönündeki BluJet ve Bluferries bağlantılarını karşı kıyı erişimi için temel seçenekler arasında gösterir.",
    transportDetailsEn:
      "Everyday mobility in Messina relies on the ATM bus and tram network; while the company manages the urban surface system, the University of Messina also officially lists dedicated links for the main campuses at Polo Centrale, Policlinico, Annunziata, and Papardo. Because the city stretches linearly along the strait, north-south corridors matter, and the university's transport page also points students to BluJet and Bluferries links toward Reggio Calabria and Villa San Giovanni for cross-strait access.",
    climateAndVibe:
      "Boğaza bakan lineer kent yapısı sayesinde şehir açık, esintili ve belirgin biçimde kıyısal hissedilir; yazlar sıcak, kışlar ılımandır. Kampüslerin farklı noktalara dağılması yüzünden günlük ritim merkez, tramvay ve otobüs koridorları ile iskele bağlantıları etrafında döner; tempo genelde Catania'dan daha sakindir.",
    climateAndVibeEn:
      "The city's long, strait-facing layout gives it an open, breezy, strongly coastal feel, with hot summers and mild winters. Because the campuses are spread across different zones, daily life revolves around the center, the tram and bus corridors, and the ferry links, and the overall pace is usually calmer than Catania.",
    transportSourceUrls: [
      "https://www.unime.it/didattica/servizi-e-agevolazioni/vita-universitaria/trasporti",
      "https://www.atmmessinaspa.it/",
      "https://www.atmmessinaspa.it/linee-universitarie.php?pag=2",
      "https://www.blujetlines.it/",
      "https://www.bluferries.it/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "reggio-calabria",
    name: "Reggio Calabria",
    nameEn: "Reggio Calabria",
    cityNameIt: "Reggio Calabria",
    altNames: ["Reggio Calabria", "Reggio di Calabria", "Reggio", "Rhegion"],
    region: "Calabria",
    placeHierarchy: "city",
    costTier: "budget",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Southern mainland metropolitan center with lower housing pressure than Italy's major university metros, so despite its transport role across the Strait it still fits the budget band for students.",
    historyShort:
      "Reggio Calabria, antik Rhegion olarak Magna Graecia'nın en eski ve en önemli kolonilerinden biri olarak gelişti. Yüzyıllar boyunca farklı Akdeniz egemenlikleri altında kalsa da kentin kimliği uzun süre boğaz üzerindeki stratejik konumu ve Yunan-Roma mirasıyla şekillendi. 1783 ve özellikle 1908 depremleri şehri ağır biçimde yıktı; bugünkü daha düzenli kıyı planı büyük ölçüde bu yeniden inşa dönemlerinin ürünüdür.",
    historyShortEn:
      "Reggio Calabria developed in antiquity as Rhegion, one of the oldest and most important colonies of Magna Graecia. Although it passed through different Mediterranean powers over the centuries, its identity remained strongly shaped by its strategic position on the strait and by its Greek and Roman legacy. The earthquakes of 1783 and especially 1908 devastated the city, and today's more orderly coastal layout is largely the result of those rebuilding phases.",
    historySourceTitle: "Reggio Calabria - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Reggio_Calabria",
    transportDetails:
      "Reggio Calabria'da ana yerel omurga ATAM'ın kentsel otobüs ağıdır; belediye de ATAM'ı metropoliten ve kentsel insan taşımacılığının resmî işletmecisi olarak tanımlar. Università Mediterranea, şehir merkezi ile başlıca ulaşım düğümlerinden kampüslere erişen belirli ATAM hatlarını duyurur; bu hatlar havaalanı, liman ve merkez koridorunu üniversite birimleriyle bağladığı için kampüs erişimi büyük ölçüde otobüs üstünden kurulur.",
    transportDetailsEn:
      "The main local mobility backbone in Reggio Calabria is the ATAM urban bus network, which the municipality identifies as the official operator for metropolitan and urban passenger transport. The University Mediterranea identifies selected ATAM lines that reach the campuses from the city center and main transport hubs; because those lines connect the airport, port, and central corridor with university sites, campus access is largely bus-based.",
    climateAndVibe:
      "Şehir çok yumuşak kışları, sıcak yazları ve sürekli deniz görünümüyle açık hava odaklı bir Akdeniz kıyı kenti hissi verir. Ölçek Catania ya da Palermo kadar baskın değildir; bu yüzden günlük hayat daha yavaş, sahil bandı daha belirgin ve öğrenci ritmi daha yerel kalır.",
    climateAndVibeEn:
      "With very mild winters, hot summers, and a constant relationship to the sea, the city feels like an outdoor-oriented Mediterranean waterfront. It does not press on you in the same way as Catania or Palermo, so everyday life is slower, the seafront is more central, and the student rhythm stays more local.",
    transportSourceUrls: [
      "https://www.unirc.it/studiare/servizi-studenti/trasporti-e-mobilita/trasporti-urbani-gratuiti",
      "https://comune.reggio-calabria.it/Organizzazioni/Details/387",
      "https://www.atam.rc.it/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "casamassima",
    name: "Casamassima",
    nameEn: "Casamassima",
    cityNameIt: "Casamassima",
    altNames: ["Casamassima", "Casamàsseme"],
    region: "Puglia",
    placeHierarchy: "satellite-town",
    primaryStudentBase:
      "Casamassima's own LUM campus municipality, with commuter spillover into the wider Bari corridor rather than Bari city proper being the guide focus.",
    costTier: "balanced",
    costCluster: "metro-satellite",
    costTierRationale:
      "Casamassima sits in the Bari commuter belt and hosts the LUM campus on the SS100 axis, so student costs usually avoid Bari-center pressure but still reflect a connected suburban-commercial corridor rather than an isolated low-cost inland town.",
    historyShort:
      "Casamassima'nın 7. ve 8. yüzyıllar civarında kurulduğu aktarılır; kökeninin bir Roma karakoluna dayandığı ise kaynakta efsane olarak sunulur. Yerleşim, iç Apulya'da tarım üzerine kurulu bir kasaba olarak gelişti ve Mavi Kasaba adıyla da anıldı.",
    historyShortEn:
      "Casamassima is described as having been founded around the seventh and eighth centuries, while its origin as a Roman encampment is presented as a legend. The settlement developed as an inland Apulian agricultural town and also became known as the Blue Town.",
    historySourceTitle: "Casamassima - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Casamassima",
    transportDetails:
      "Casamassima'da öğrenci hareketliliği LUM'un SS100 üzerindeki kampüsü etrafında şekillenir. Üniversitenin resmî sayfaları didaktik merkezin Casamassima'da olduğunu ve Miccolis'in hem Casamassima-Università LUM hem de Bari-LUM bağlantıları sunduğunu gösteriyor; bu da kampüs belediyesini Bari koridoruna bağlayan bir düzen yaratır. Belediye de toplu taşıma ve mobilite hizmetlerini kendi kamusal ulaşım başlığı altında topladığı için, günlük rota mantığı merkezden çok kampüs ve bölgesel bağlantılar etrafında kuruludur.",
    transportDetailsEn:
      "In Casamassima, student mobility is organized around the LUM campus on the SS100 corridor. Official university pages show that the teaching site is in Casamassima and that Miccolis provides both Casamassima-Universita LUM and Bari-LUM links, creating a campus-town pattern tied to the wider Bari corridor. The municipality also groups local mobility under its public transport section, so day-to-day movement is shaped more by campus and regional connections than by a dense historic-center network.",
    climateAndVibe:
      "Bari iç kesimine yakın Apulya karakteri nedeniyle yazlar sıcak ve güneşli, kışlar ise görece ılımandır. Ölçek küçük, otomobil ve servis odaklıdır; bu yüzden Casamassima daha çok kampüse yakın, pratik ve sakin bir öğrenci üssü gibi hissedilir. Sosyal ve ticari seçenekler tamamen yok değildir, ama büyük şehir yoğunluğundan çok banliyö-koridor ritmi baskındır.",
    climateAndVibeEn:
      "With its inland-apulian position near Bari, Casamassima has hot sunny summers and comparatively mild winters. The scale is small and more service-and-car-oriented, so it feels like a practical, quieter student base near campus. Social and retail options are present, but the dominant rhythm is suburban-corridor life rather than big-city intensity.",
    transportSourceUrls: [
      "https://www.lum.it/strutture/",
      "https://www.lum.it/miccolis-bus/",
      "https://www.comune.casamassima.ba.it/Argomenti/Trasporto-pubblico",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [
      "The Wikipedia history source presents the Roman-encampment origin as legend and does not substantiate a more detailed early chronology, so those claims are intentionally omitted.",
      "The official sources reviewed confirm campus location and Bari/Casamassima bus links, but they do not quantify how many LUM students actually live in Casamassima versus elsewhere in the Bari commuter corridor.",
    ],
  },
  {
    slug: "lecce",
    name: "Lecce",
    nameEn: "Lecce",
    cityNameIt: "Lecce",
    altNames: ["Lecce", "Lècce", "Luppìu", "Lupiae"],
    region: "Puglia",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Lecce is a major southern university city with tourism pressure in the historic center and a broad services base, but it generally remains more attainable for students than Italy's premium northern metros or peak resort markets.",
    historyShort:
      "Lecce'nin erken geçmişi Messap yerleşimine ve ardından Roma dönemindeki Lupiae kentine uzanır; Hadrianus çağında kent yeni bir yerleşim düzeni kazanarak önemli bir merkez oldu. Batı Roma'nın çöküşünden sonra Got, Bizans ve Lombard dönemlerinden geçti. Norman fethinden sonra yeniden güçlenen Lecce, özellikle erken modern çağda surları ve barok anıtlarıyla güney İtalya'nın başlıca kentlerinden birine dönüştü.",
    historyShortEn:
      "Lecce's early history reaches from a Messapian settlement to the Roman city of Lupiae, which was reshaped into an important center in the age of Hadrian. After the fall of the Western Roman Empire it passed through Gothic, Byzantine, and Lombard phases. Re-energized after the Norman conquest, Lecce later became one of the leading cities of southern Italy, especially through its walls and Baroque building boom in the early modern period.",
    historySourceTitle: "Lecce - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Lecce",
    transportDetails:
      "Lecce'de kentsel hareketlilik SGM'nin yürüttüğü ağ üzerine kurulu; işletmeci resmî olarak şehir içi ulaşımı yönettiğini, yaklaşık 183 km'lik ağda otobüslerle birlikte 2012'den beri filobüs hattı da sunduğunu belirtiyor. Belediye, yaya ve bisiklet erişimini de içeren sürdürülebilir hareketliliği vurguluyor. Üniversite tarafında Lecce yaşamı tek bir kompakt kampüse sıkışmaz: resmî Unisalento sayfaları hem Lecce-Monteroni eksenindeki Campus Ecotekne'yi hem de şehir içindeki Studium 2000/merkez plessilerini işaret ettiği için öğrenciler için günlük düzen çoğu zaman otobüs ve yürüyüş kombinasyonuna dayanır.",
    transportDetailsEn:
      "Urban movement in Lecce is built around the SGM network; the operator officially states that it runs the city's public transport across a network of about 183 km and, since 2012, includes trolleybus service alongside buses. The municipality also emphasizes sustainable mobility, including walking and cycling. On the university side, student life is not concentrated in one compact campus: official Unisalento pages point both to Campus Ecotekne on the Lecce-Monteroni axis and to in-town Studium 2000/central sites, so daily routines often rely on a bus-and-walk combination.",
    climateAndVibe:
      "Lecce sıcak, güneşli ve uzun yazlı Salento iklimine sahiptir; kışlar genelde yumuşaktır. Tarihi merkez yoğun karakter ve gece hayatı verirken, kampüs yönündeki alanlar daha işlevsel ve yayılmış hissedilir. Sonuç olarak şehir hem görsel olarak güçlü hem de gündelik yaşamda orta ölçekli ve yönetilebilir bir öğrenci ortamı sunar.",
    climateAndVibeEn:
      "Lecce has the hot, sunny, long-summer climate typical of Salento, with generally mild winters. The historic center brings character and nightlife, while the campus-facing areas feel more functional and spread out. The result is a student city that is visually rich but still medium-scale and manageable in daily life.",
    transportSourceUrls: [
      "https://www.sgmlecce.it/servizi/trasporto-pubblico",
      "https://www.sgmlecce.it/servizi/trasporto-pubblico/mappa-linee",
      "https://www.comune.lecce.it/aree-tematiche/trasporti",
      "https://isufi.unisalento.it/contatti/",
      "https://trasparenza.unisalento.it/page/40/details/1896/dip-di-studi-umanistici.html",
      "https://trasparenza.unisalento.it/page/75/details/22255/dd-n-827-del-03072026-procedura-selettiva-per-il-conferimento-di-incarichi-di-insegnamento-mediante-affidamenti-o-mediante-contratti-di-diritto-privato-nei-ssd-iinf-math-cear-iind-ichi-stat-ibio-dei-corsi-di-studio-del-dipartimento-di-ingegneria-dellinnovazione-sede-di-lecce-i-semestre-aa-20262027.html",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [
      "The official university pages reviewed confirm both central Lecce/Studium and Ecotekne sites, but they do not provide one single current page that consolidates all student-facing teaching locations in the city.",
    ],
  },
  {
    slug: "pescara",
    name: "Pescara",
    nameEn: "Pescara",
    cityNameIt: "Pescara",
    altNames: ["Pescara", "Pescàrë", "Piscàrë"],
    region: "Abruzzo",
    placeHierarchy: "city",
    primaryStudentBase:
      "Pescara for the Viale Pindaro campus and city-embedded departments, within a two-campus Chieti-Pescara university system rather than a standalone Chieti guide split.",
    costTier: "balanced",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Pescara is the largest urban hub in Abruzzo and a coastal university city with stronger service depth and rental demand than inland towns, but it still usually sits below Italy's highest-cost metro and alpine/premium markets.",
    historyShort:
      "Pescara'nın kökleri Roma öncesi Aternum limanına uzanır; kent, Vestini ve Marrucini topluluklarının denize açılan ticaret kapısı olarak gelişti ve Roma yollarına bağlandı. Orta Çağ'da Lombard yıkımını yaşadı, ardından balıkçı yerleşimi ve kale kasabası olarak yeniden şekillendi. Modern Pescara ise 19. ve 20. yüzyıllarda eski Pescara ile Castellammare Adriatico'nun birleşmesi ve savaş sonrası yeniden inşayla ortaya çıkan daha yeni bir Adriyatik şehridir.",
    historyShortEn:
      "Pescara's roots go back to the pre-Roman port of Aternum, which developed as the seaward trading outlet of the Vestini and Marrucini and was tied into the Roman road system. In the Middle Ages it suffered Lombard destruction and later re-formed as a fishing settlement and fortified town. Modern Pescara emerged through the nineteenth- and twentieth-century merging of old Pescara with Castellammare Adriatico and the large postwar rebuilding that followed.",
    historySourceTitle: "Pescara - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Pescara",
    transportDetails:
      "Pescara'da günlük öğrenci hareketliliği TUA'nın kent içi ve metropol alan ağına dayanır: belediye, 20 hatlık yaklaşık 300 km'lik bir kentsel ağ ve Chieti-Pescara metropol alanını kapsayan bütünleşik bağlantılar tanımlar. TUA da Pescara'nın kentsel hatlarıyla alan metropoliten bağlantılarını aynı resmî hat yapısı içinde listeler. Üniversite tarafında Ud'A'nın Pescara ayağı, Viale Pindaro'daki şehir içi kampüse dayanır; kurumun tarih sayfası ateneonun uzun süredir Pescara ve Chieti'de paralel kampüsler işlettiğini gösterir ve bu kayıt Pescara öğrenci üssünü kapsar.",
    transportDetailsEn:
      "In Pescara, daily student mobility relies on TUA's urban and metropolitan network: the municipality describes an urban system of 20 lines across about 300 km, with integrated connections across the Chieti-Pescara metropolitan area. TUA likewise lists Pescara's urban lines together with the wider area network in the same official route structure. On the university side, Ud'A's Pescara footprint centers on the city-embedded Viale Pindaro campus, and the university's history page shows that the institution has long operated parallel campuses in Pescara and Chieti; this record covers the Pescara student base.",
    climateAndVibe:
      "Pescara güneşli Adriyatik kıyısında yer aldığı için yazları sıcak ve deniz etkili, kışları ise iç kesim üniversite şehirlerine göre daha ılımandır. Şehir tarihi tepe kentlerinden çok daha modern, yatay ve sahil odaklı hissedilir. Bu da öğrenci deneyimini plaj, istasyon, bulvarlar ve kampüs arasında dağılan daha açık bir kent ritmine çevirir.",
    climateAndVibeEn:
      "Because Pescara sits on the sunny Adriatic coast, summers are hot and sea-influenced while winters are milder than in inland university towns. The city feels far more modern, horizontal, and waterfront-oriented than Italy's older hill cities. That gives student life a more open urban rhythm spread between the beach, station, boulevards, and campus.",
    transportSourceUrls: [
      "https://www.comune.pescara.it/approfondimenti/mobilita/bus-e-taxi/",
      "https://www.tuabruzzo.it/linee-e-orari/83.html",
      "https://en.unich.it/university/uda/history-university",
      "https://www.unich.it/ateneo/sedi-centri-e-strutture/sede-di-pescara",
      "https://www.unich.it/ateneo/sedi-centri-e-strutture/sede-di-chieti",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [
      "The official university sources reviewed clearly confirm the two-campus Chieti-Pescara structure, but they do not provide one concise current roster page for every department split across the two cities in this research pass.",
    ],
  },
  {
    slug: "cassino",
    name: "Cassino",
    nameEn: "Cassino",
    cityNameIt: "Cassino",
    altNames: ["Cassino"],
    region: "Lazio",
    placeHierarchy: "city",
    primaryStudentBase:
      "Campus Folcara and the adjacent city-station corridor, since the main university campus sits just outside the center rather than in a separate satellite municipality.",
    costTier: "budget",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Cassino is an inland southern Lazio university city on the Rome-Naples axis, but its secondary-market scale and edge-campus layout keep it in ItalyPath's lower student-cost band rather than the more pressured Lazio hubs.",
    historyShort:
      "Cassino'nun kökeni Monte Cairo yakınındaki antik Casinum yerleşimine uzanır ve kent daha sonra Roma denetimine giren stratejik bir iç geçit noktası oldu. Erken Orta Çağ'da Aziz Benedikt'in Montecassino'da manastırı kurması, çevredeki yerleşimin dinsel ve kültürel ağırlığını belirledi; kent uzun süre San Germano adıyla yaşadı. II. Dünya Savaşı'ndaki Monte Cassino muharebeleri şehri neredeyse tamamen yok etti ve bugünkü Cassino büyük ölçüde savaş sonrası yeniden inşanın ürünüdür.",
    historyShortEn:
      "Cassino's roots go back to ancient Casinum near Monte Cairo, and it later became a strategic inland passage point under Roman control. In the early Middle Ages, Saint Benedict's foundation of the monastery at Montecassino gave the surrounding settlement a lasting religious and cultural importance, and the town long lived under the name San Germano. The battles of Monte Cassino in the Second World War almost destroyed the city, so today's Cassino is largely the result of postwar reconstruction.",
    historySourceTitle: "Cassino - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Cassino",
    transportDetails:
      "Cassino'da öğrenci hareketliliği esas olarak istasyon-merkez-Folcara kampüsü ekseninde kurulur. UNICAS'ın öğrenci bilgi sayfası, Campus Folcara'ya ulaşan 16 numaralı Autoservizi Magni hattını doğrudan işaret eder; üniversitenin Economics with Data Science kampüs sayfası ise kampüsün şehirle yerel otobüslerle bağlı olduğunu ve tren istasyonunun yaklaşık 20 dakikalık yürüme mesafesinde bulunduğunu söyler. Belediye de Magni ve Mastrantoni tarafından işletilen aktif yerel hatları resmî olarak yayımladığı için, günlük düzen büyük ölçüde yerel otobüsler ve Cassino istasyonu üzerinden çalışır.",
    transportDetailsEn:
      "Student mobility in Cassino is organized mainly around the station-center-Folcara campus axis. UNICAS points directly to the Line 16 Autoservizi Magni service reaching Campus Folcara, while the university's Economics with Data Science campus page says the campus is linked to the city by local bus services and that the railway station is about a twenty-minute walk away. The municipality also officially publishes the active local lines run by Magni and Mastrantoni, so day-to-day movement works largely through local buses and Cassino station.",
    climateAndVibe:
      "Cassino, güney Lazio'nun daha sıcak ve güneşli iç vadilerinden birinde yer alır; yazlar belirgin biçimde sıcak, kışlar ise kuzey iç kesim öğrenci şehirlerine göre daha yumuşaktır. Şehir devasa değildir ve tempo merkez, istasyon ve kampüs arasında pratik bir düzende akar. Montecassino ve savaş hafızası kente güçlü bir tarih katmanı verir, ama günlük öğrenci deneyimi daha çok ulaşılabilir ölçekte bir orta kent hissi taşır.",
    climateAndVibeEn:
      "Cassino sits in one of southern Lazio's warmer and sunnier inland valleys, with clearly hot summers and winters that are milder than in many northern inland student cities. It is not a huge city, and the rhythm of daily life moves in a practical loop between the center, the station, and the campus. Montecassino and the city's war memory add a strong historical layer, but the everyday student experience feels more like a manageable mid-sized town.",
    transportSourceUrls: [
      "https://www.unicas.it/cuori/studenti-iscritti/informazioni-utili/",
      "https://eds.unicas.it/overview/campus",
      "https://www.comune.cassino.fr.it/it-it/novita/avvisi/2025/viabilita-e-trasporti/trasporto-locale-gli-orari-e-le-linee-attive-in-citta-con-le-societa-magni-e-mastrantoni-342876-1-c463aa2dde7c5909d04705de06a35d09",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [
      "Official sources confirm that Line 16 reaches Campus Folcara and that the municipality publishes active Magni and Mastrantoni local lines, but they do not provide one stable consolidated network map on the same student-facing page.",
    ],
  },
  {
    slug: "viterbo",
    name: "Viterbo",
    nameEn: "Viterbo",
    cityNameIt: "Viterbo",
    altNames: ["Viterbo", "Veterbe", "Viterbium"],
    region: "Lazio",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Viterbo is a sizeable historic university city in Lazio with provincial-capital functions and steady Rome-facing connectivity, so it sits above smaller inland budget towns but below the premium pressure of the region's largest hubs.",
    historyShort:
      "Viterbo, 8. yüzyılda Castrum Viterbii olarak kayda geçer ve Lombard kralı Desiderius döneminde tahkim edilen bir yerleşim olarak görünür. 11. yüzyıl sonuna gelindiğinde özgür komün kimliği kazandı; 12. ve 13. yüzyıllarda papaların sık kullandığı bir ikamet ve siyaset merkezi haline gelerek Orta İtalya'nın başlıca kentlerinden biri oldu. Bugünkü surlu merkez ve papalık sarayı hissi, büyük ölçüde bu ortaçağ yükselişinin kalıcı izidir.",
    historyShortEn:
      "Viterbo first appears in the eighth century as Castrum Viterbii and is presented as a fortified settlement in the age of the Lombard king Desiderius. By the end of the eleventh century it had become a free commune, and in the twelfth and thirteenth centuries it grew into one of central Italy's main cities as a frequent papal residence and political center. The walled core and papal-palace identity that define the city today are largely the lasting imprint of that medieval rise.",
    historySourceTitle: "Viterbo - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Viterbo",
    transportDetails:
      "Viterbo'da öğrenci hareketliliği istasyonlar ile Unitus durakları arasındaki tren-artı-otobüs kombinasyonuna dayanır. Unitus'un resmî ulaşım sayfası, Porta Romana ve Porta Fiorentina eksenindeki demiryolu erişimini, Cotral'ın Roma ve Orte bağlantılarını ve kentsel hareketliliğin Francigena tarafından yönetildiğini açıkça toplar. Trenitalia'nın UNITUS Link hizmeti de Viterbo P.F. istasyonundan üniversiteye doğrudan tren+otobüs bağlantısı sunduğu için, günlük düzende Porta Romana, Porta Fiorentina, Via San Camillo de Lellis ve Piazzale Gramsci gibi düğümler öne çıkar.",
    transportDetailsEn:
      "Student mobility in Viterbo relies on a train-and-bus combination between the stations and Unitus stops. The university's official access page explicitly groups rail access around Porta Romana and Porta Fiorentina, Cotral links toward Rome and Orte, and the fact that urban mobility is managed by Francigena. Trenitalia's UNITUS Link also provides a direct rail-plus-bus connection from Viterbo P.F. station to the university, so daily movement revolves around nodes such as Porta Romana, Porta Fiorentina, Via San Camillo de Lellis, and Piazzale Gramsci.",
    climateAndVibe:
      "Viterbo, Roma'ya göre daha serin kışları ve sıcak ama yüksekçe konumu sayesinde biraz daha dengelenen yazları olan iç kesim Lazio şehridir. Tarihi merkez surlu, taş dokulu ve belirgin biçimde ortaçağ karakterlidir; bu da öğrenci yaşamına güçlü bir mekansal kimlik verir. Günlük ritim büyükşehir kadar hızlı değildir, ama kampüs noktaları ile istasyonlar arasındaki hareketlilik şehri durağan da bırakmaz.",
    climateAndVibeEn:
      "Viterbo is an inland Lazio city with cooler winters than Rome and hot summers that are moderated somewhat by its elevation. The historic center is walled, stony, and strongly medieval in character, which gives student life a very specific spatial identity. The daily rhythm is not as fast as a major metro, yet the movement between university sites and stations keeps the city from feeling static.",
    transportSourceUrls: [
      "https://www.unitus.it/ateneo/strutture-e-servizi/sedi-e-poli/come-raggiungerci/",
      "https://www.trenitalia.com/it/regionale/collegamenti-regionale/unitus-link.html",
      "https://www.francigena.vt.it/it/linee",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [
      "Official sources confirm multiple rail and bus access nodes for Unitus, but they do not provide one single current page that consolidates every student-facing teaching site in Viterbo into a single mobility map.",
    ],
  },
  {
    slug: "teramo",
    name: "Teramo",
    nameEn: "Teramo",
    cityNameIt: "Teramo",
    altNames: ["Teramo", "Tèreme", "Interamnia Praetuttiorum"],
    region: "Abruzzo",
    placeHierarchy: "city",
    primaryStudentBase:
      "The main student base is the Colleparco-Campus Aurelio Saliceti axis in Teramo city, even though UniTE also maintains additional sites within the wider municipal territory.",
    costTier: "budget",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Teramo is an inland Abruzzo university city with provincial-capital functions, but without the coastal, metro, alpine, or heavy-tourism premium factors that usually push student costs into ItalyPath's higher bands.",
    historyShort:
      "Teramo'nun erken çekirdeği, Vezzola ve Tordino nehirleri arasındaki Praetutii yerleşiminden gelişti; Roma döneminde kent Interamnia Praetuttiorum adıyla önemli bir municipium haline geldi. Roma çağında tiyatro, hamam ve diğer kamusal yapılarla zenginleşen şehir, imparatorluk sonrasında Got, Bizans ve Lombard evrelerinden geçti. Norman dönemindeki yıkıma rağmen yeniden toparlandı ve bugünkü kentsel kimliğinin temelini antik kalıntılarla ortaçağ dokusunun birleşimi oluşturdu.",
    historyShortEn:
      "Teramo's early core grew from a Praetutii settlement between the Vezzola and Tordino rivers, and in the Roman age it became the important municipium of Interamnia Praetuttiorum. The city prospered in Roman times with a theater, baths, and other public structures, then passed through Gothic, Byzantine, and Lombard phases after the empire. Despite destruction in the Norman period, it recovered, and its present urban identity is built on the overlap between ancient remains and a medieval townscape.",
    historySourceTitle: "Teramo - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Teramo",
    transportDetails:
      "Teramo'da öğrenci hareketliliği merkez, istasyon ve kampüs arasındaki otobüs omurgası üzerinden işler. UniTE'nin resmî ulaşım sayfası, yerel işletmeciyi STAUR olarak anarken Kampüs A. Saliceti'ye 6 ve 7 numaralı otobüslerle ulaşıldığını söyler; kentsel işletmecinin resmî hat sayfası da 7 numaralı hattın Piazza Garibaldi, Colleparco, Università, Mensa Università ve demiryolu istasyonu duraklarını aynı rota içinde birleştirdiğini gösterir. Üniversitenin aynı sayfası ayrıca kentin Roma, L'Aquila ve Pescara ile otobüs bağlantılarını ve Giulianova üzerinden bölgesel/daha uzun mesafeli demiryolu erişimini vurguladığı için, günlük düzen kampüs otobüsleriyle daha geniş bölgesel bağlantıların birleşimine dayanır.",
    transportDetailsEn:
      "In Teramo, student mobility works through the bus backbone linking the center, the station, and the campus. UniTE's official access page refers to the local operator as STAUR and says that Campus A. Saliceti is reached by Lines 6 and 7, while the urban operator's official route page shows Line 7 tying together Piazza Garibaldi, Colleparco, the university, the university canteen, and railway-station stops in one route. The same university page also emphasizes bus links toward Rome, L'Aquila, and Pescara together with rail access via Giulianova, so the daily pattern combines campus buses with wider regional connections.",
    climateAndVibe:
      "Teramo, Gran Sasso ile Adriyatik arasında kalan iç kesim Abruzzo karakterini taşır; yazlar sıcak olabilir ama kıyıdan biraz daha kara etkili, kışlar ise daha serin geçer ve zaman zaman kar görülür. Kent ölçek olarak yönetilebilir, tarihi merkez ile kampüs yamaçları arasında dağılmıştır. Bu yüzden öğrenci yaşamı ne sahil şehri kadar açık ne de izole bir dağ kasabası kadar kapalıdır; daha çok sakin ama bağlantılı bir orta kent ritmi sunar.",
    climateAndVibeEn:
      "Teramo carries the inland Abruzzo character of a city set between Gran Sasso and the Adriatic: summers can be hot but feel more continental than on the coast, while winters are cooler and can bring some snow. The scale is manageable, with student life spread between the historic center and the hillside campus areas. As a result, it feels neither as open as a seaside city nor as closed-in as an isolated mountain town, but rather like a calm, connected medium-sized student city.",
    transportSourceUrls: [
      "https://www.unite.it/UniTE/Futuri_studenti/Insegnamenti/Dove_siamo/Come_arrivare_a_Teramo",
      "https://trasportourbanoteramo.it/orari-bus/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [
      "The official UniTE page refers to the local operator as STAUR, while the current official urban-lines page is branded through Baltour/Trasporto urbano Teramo; the campus-serving route structure is clear, but the operator naming has changed across official sources.",
    ],
  },
  {
    slug: "cenova",
    name: "Cenova",
    nameEn: "Genoa",
    cityNameIt: "Genova",
    altNames: ["Cenova", "Genova", "Genoa"],
    region: "Liguria",
    placeHierarchy: "city",
    costTier: "high",
    costCluster: "regional-capital",
    costTierRationale:
      "Liguria's regional capital combines big-city demand, constrained coastal housing stock, and a dense historic fabric, which places student costs in ItalyPath's high band.",
    historyShort:
      "Cenova'nın yerleşim çekirdeği, MÖ 5. yüzyılda Ligurların Castello tepesindeki oppidumuna kadar uzanır; kent, Kartacalılarca yıkıldıktan sonra Roma ile yeniden büyüdü ve belediye statüsü kazandı. Batı Roma'nın çöküşünden sonra küçük bir merkez olarak gerilese de ticaret filosunu yavaş yavaş kurdu. Bu denizcilik birikimi, sonraki yüzyıllarda Cenova'yı Akdeniz'in en güçlü ticaret cumhuriyetlerinden birine dönüştüren zemini hazırladı.",
    historyShortEn:
      "Genoa's earliest urban core goes back to a Ligurian oppidum on the Castello hill in the fifth century BC; after being destroyed by the Carthaginians, it grew again in alliance with Rome and gained municipal status. It shrank after the fall of the Western Roman Empire, but slowly rebuilt its merchant fleet as a modest centre. That maritime base helped prepare the rise of Genoa into one of the most powerful commercial republics of the Mediterranean in later centuries.",
    historySourceTitle: "Genoa - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Genoa",
    transportDetails:
      "Cenova'da öğrenci hareketliliği AMT'nin otobüs, metro, füniküler, asansör ve özel hatlarının birleştiği çok katmanlı ağ üzerinden yürür. UniGe, CityPass'ın tüm AMT ağı, il otobüsleri, Navebus, Volabus ve Cenova-Casella demiryolunda geçerli olduğunu; AMT ise metronun Brin ile Brignole arasında sekiz istasyonla Principe ve Brignole tren garlarını, Darsena ve Sarzano üniversite kutuplarını ve şehir merkezini bağladığını belirtir. Yamaç mahallelerine çıkan fünikülerler ve kremayer hat da dik topoğrafyada günlük erişimin önemli parçasıdır.",
    transportDetailsEn:
      "Student mobility in Genoa runs through AMT's layered network of buses, metro, funiculars, lifts, and other urban services. UniGe states that the CityPass is valid across the full AMT network, provincial buses, Navebus, Volabus, and the Genoa-Casella railway, while AMT describes the metro as an eight-station link between Brin and Brignole that connects the Principe and Brignole rail hubs, the Darsena and Sarzano university areas, and the city centre. Funiculars and the rack railway are also an important everyday tool for reaching hillside districts in the city's steep terrain.",
    climateAndVibe:
      "Ligurya kıyısındaki konumu nedeniyle kışlar görece ılıman, yazlar ise sıcak ve nemlidir. Şehir düz değil, katmanlı ve dikey hissedilir; tarihi merkez, liman çevresi ve yamaç mahalleleri arasında sürekli iniş çıkış vardır. Öğrenci açısından tempo büyük şehir kadar yoğundur ama deniz, dar sokaklar ve kampüslerin şehir dokusuna dağılmış olması günlük yaşama belirgin karakter verir.",
    climateAndVibeEn:
      "Its Ligurian coastal setting brings relatively mild winters and warm, humid summers. Genoa feels vertical rather than flat, with constant movement between the old centre, the port, and hillside neighborhoods. For students, the pace is that of a large city, but the sea, narrow streets, and campus sites embedded in the urban fabric give daily life a very specific character.",
    transportSourceUrls: [
      "https://unige.it/en/services/transports",
      "https://www.amt.genova.it/amt/trasporto-multimodale/metropolitana/",
      "https://www.amt.genova.it/amt/trasporto-multimodale/funicolari/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "ferrara",
    name: "Ferrara",
    nameEn: "Ferrara",
    cityNameIt: "Ferrara",
    altNames: ["Ferrara"],
    region: "Emilia-Romagna",
    placeHierarchy: "city",
    costTier: "balanced",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Ferrara is a medium-sized university city with strong bike-based mobility and without the housing pressure of Italy's biggest metro or top tourism markets, so it fits the balanced band.",
    historyShort:
      "Ferrara'nın bugünkü konumundaki kökeni tartışmalı olsa da kaynaklar, geç Antikçağ ile erken Orta Çağ arasında Po kıyısındaki yerleşim çekirdeğinin geliştiğini ve kentin 753'te ilk kez belgelendiğini aktarır. 12. yüzyılda özgür komün haline gelen şehir, 1264'ten itibaren Este hanedanının yönetiminde siyasi ve kültürel ağırlık kazandı. Rönesans döneminde saraylar, geniş caddeler ve planlı genişleme ile biçimlenen kent dokusu bugün de Ferrara'nın temel kimliğini belirler.",
    historyShortEn:
      "Although the exact origin of Ferrara on its current site remains debated, the article describes an early settlement taking shape between late antiquity and the early Middle Ages and notes the city's first documentary appearance in 753. Ferrara became a free commune in the twelfth century and then gained political and cultural weight under the House of Este from 1264 onward. Its Renaissance identity, built through palaces, broad streets, and planned expansion, still defines the city today.",
    historySourceTitle: "Ferrara - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Ferrara",
    transportDetails:
      "Ferrara'da günlük öğrenci hareketliliği büyük ölçüde bisiklet ve TPER/TPF otobüs ağı etrafında şekillenir. Unife, pek çok üniversite noktasına giden hatların Stazione Ferroviaria'dan geçtiğini; Cona öğretim alanına ise kentsel hatlar ve Ferrara-Codigoro demiryolu üzerinden erişilebildiğini belirtir. TPER'nin Ferrara havzası için yayımladığı hizmet bilgileri de 21 kentsel ve 41 kent dışı hattın aynı ağ içinde çalıştığını gösterir.",
    transportDetailsEn:
      "In Ferrara, day-to-day student mobility is shaped mainly by bicycles and the TPER/TPF bus network. The University of Ferrara states that many lines serving university locations pass through the railway station, and that the Cona teaching area can also be reached through urban lines and the Ferrara-Codigoro rail link. TPER's service information for the Ferrara basin also shows an integrated network with 21 urban and 41 extra-urban lines.",
    climateAndVibe:
      "Po Ovası'ndaki konumu yüzünden yazlar sıcak ve bunaltıcı, kışlar ise sisli ve nemli olabilir. Şehir düz, kompakt ve ritmi görece sakindir; tarihi merkez ile üniversite yaşamı birbirine yakın yürür. Ferrara'nın en belirgin öğrenci hissi, otomobilden çok bisikletle akan gündelik hayatıdır.",
    climateAndVibeEn:
      "Because it sits in the Po plain, Ferrara can feel hot and heavy in summer, while winters are often damp and foggy. The city is flat, compact, and comparatively calm, with university life closely woven into the historic core. Its clearest student character comes from a daily rhythm that moves more by bicycle than by car.",
    transportSourceUrls: [
      "https://www.unife.it/it/studiare/trasporti/come-muoversi-a-ferrara/muoversi-pubblico",
      "https://www.unife.it/en/live/city-services/transport-services",
      "https://www.tper.it/mappaferrara",
      "https://www.tper.it/assistenza-clienti/carta-dei-servizi/ferrara",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: [],
    uncertain: [],
  },
  {
    slug: "macerata",
    name: "Macerata",
    nameEn: "Macerata",
    cityNameIt: "Macerata",
    altNames: ["Macerata"],
    region: "Marche",
    placeHierarchy: "city",
    costTier: "budget",
    costCluster: "provincial-student-city",
    costTierRationale:
      "As a smaller inland provincial capital with a compact university-centered core and less housing pressure than Marche's bigger coastal or regional hubs, Macerata fits ItalyPath's budget band.",
    historyShort:
      "Macerata'nın tarihsel çekirdeği, Chienti ile Potenza nehirleri arasındaki tepede yer alan ve Picenler ile Roma dönemindeki Ricina/Helvia Recina yerleşimleriyle ilişkilendirilen daha eski bir merkeze bağlanır. Barbar akınlarından sonra nüfus tepelere çekildi ve yeniden kurulan yerleşim zamanla Macerata adıyla büyüdü. 1138'de komün statüsü kazanması ve 1320'de piskoposluk merkezinin buraya taşınması kentin kurumsal önemini belirgin biçimde artırdı.",
    historyShortEn:
      "Macerata's historical core is tied to an earlier centre on the hill between the Chienti and Potenza rivers, linked in the article to the Picene and Roman settlement of Ricina or Helvia Recina. After barbarian destruction, the population retreated to the hills and the rebuilt settlement gradually developed as Macerata. Its institutional weight increased notably when it became a commune in 1138 and when the episcopal seat was transferred there in 1320.",
    historySourceTitle: "Macerata - Wikipedia (EN)",
    historySourceUrl: "https://en.wikipedia.org/wiki/Macerata",
    transportDetails:
      "Macerata'da yerel hareketlilik APM'nin işlettiği kentsel otobüs ağıyla yürür; şirket resmî olarak şehir hizmetinin 12 hat ve 28 otobüslük filoyla çalıştığını belirtir. Üniversite, merkezdeki ana Macerata istasyonunun çoğu fakülteye yakın olduğunu, Macerata Universita istasyonunun ise Piazza della Liberta'ya yaklaşık 2,5 km mesafede bulunduğunu söylüyor. Bölgesel geliş-gidişlerde Piazza Pizzarello otobüs terminali ve tren bağlantıları, küçük ölçekli kent yaşamını dış bağlantılarla tamamlar.",
    transportDetailsEn:
      "Local mobility in Macerata depends on the urban bus network run by APM, which officially describes the city service as a 12-line system with a fleet of 28 buses. The university says the main Macerata rail station is close to most university facilities, while Macerata Universita station sits about 2.5 km from Piazza della Liberta. For regional movement, the Piazza Pizzarello bus terminal and rail connections complement the city's small-scale daily life.",
    climateAndVibe:
      "Macerata iç kesimdeki bir Marche tepe şehri olduğu için yazları sıcak ama akşamları daha ferah, kışları ise kıyıya göre daha serin geçer. Tarihi merkez küçük ve yürünebilir, üniversite yapıları şehir dokusuna yayılmıştır. Öğrenci hayatı burada büyük şehir çeşitliliğinden çok sakin, odaklı ve yerel ölçekte ilerler.",
    climateAndVibeEn:
      "As an inland hill town in Marche, Macerata has hot summers with somewhat cooler evenings and winters that feel cooler than on the coast. The historic centre is small and walkable, with university buildings spread through the town fabric. Student life here feels calmer, more focused, and more local in scale than in a larger city.",
    transportSourceUrls: [
      "https://www.unimc.it/en/services/useful-information/how-to-reach-macerata",
      "https://www.apmgroup.it/servizi/trasporti/",
      "https://www.apmgroup.it/servizi/trasporti/orario-bus/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: ["weak-source"],
    uncertain: [
      "The English Wikipedia history section for Macerata is marked as containing unsourced material (banner dated August 2024), so the summary is limited to broad chronology stated on that page.",
    ],
  },
  {
    slug: "pollenzo",
    name: "Pollenzo",
    nameEn: "Pollenzo",
    cityNameIt: "Pollenzo",
    altNames: ["Pollenzo", "Polèns", "Pollentia"],
    region: "Piemonte",
    placeHierarchy: "hamlet",
    primaryStudentBase: "Bra",
    costTier: "balanced",
    costCluster: "provincial-student-city",
    costTierRationale:
      "Although the campus is in the hamlet of Pollenzo, everyday student life usually depends on nearby Bra's provincial scale, daily services, and rail-bus interchange. That Bra-based provincial setup fits the balanced band rather than treating Pollenzo as an isolated hamlet.",
    historyShort:
      "Pollenzo, antik Roma kenti Pollentia'nın bulunduğu yerde gelişen bir yerleşimdir ve kaynaklarda MÖ 2. yüzyıla uzanan bir kuruluş anlatısı yer alır. 402 yılındaki Pollenzo Muharebesi burayı geç Roma döneminde yeniden öne çıkardı. 19. yüzyılda Carlo Alberto köyü ve kaleyi örnek bir tarım ve enoloji mülküne dönüştürdü; 2004'ten beri Agenzia di Pollenzo'da Gastronomi Bilimleri Üniversitesi bulunur.",
    historyShortEn:
      "Pollenzo developed on the site of the Roman city of Pollentia, which the article traces back to a foundation in the 2nd century BC. The Battle of Pollenzo in 402 brought the site back into prominence in the late Roman period. In the nineteenth century Carlo Alberto reshaped the village and castle into a model agricultural and wine estate, and since 2004 the Agenzia di Pollenzo has hosted the University of Gastronomic Sciences.",
    historySourceTitle: "Pollenzo (Italian Wikipedia)",
    historySourceUrl: "https://it.wikipedia.org/wiki/Pollenzo",
    transportDetails:
      "Pollenzo bir frazione olduğu için öğrencilerin günlük hareketliliği çoğunlukla Bra üzerinden kurulur. Bra Belediyesi, conurbation otobüs ağının Bra Movicentro'da demiryoluyla entegre olduğunu ve Bra ile Pollenzo'yu bağladığını belirtirken, UNISG de Bra istasyonu ve merkezinden kampüse otobüs erişimi olduğunu açıkça yazar. Pratikte Bra tren istasyonu ve Movicentro, Pollenzo kampüsüne giden son bölüm için ana aktarma düğümüdür.",
    transportDetailsEn:
      "Because Pollenzo is a frazione, students usually organize everyday mobility through Bra. The Municipality of Bra states that the conurbation bus network is integrated with rail at Bra's Movicentro and links Bra with Pollenzo, while UNISG explicitly says the campus can be reached by bus from Bra station and the town center. In practice, Bra railway station and the Movicentro act as the main interchange for the last stretch to the Pollenzo campus.",
    climateAndVibe:
      "Bra-Pollenzo çevresi Langhe eşiğinde yer aldığı için yazlar sıcak, kışlar ise serin ve zaman zaman sisli hissedebilir. Pollenzo'nun kendisi tarihi Agenzia çevresinde çok küçük ve sakin bir kampüs-hamlet atmosferi sunar; daha geniş gündelik ihtiyaçlar ve sosyal hayat ise genellikle Bra tarafında çözülür.",
    climateAndVibeEn:
      "On the edge of the Langhe area, Bra and Pollenzo usually feel warm in summer and cool, sometimes foggy, in winter. Pollenzo itself is a very small and quiet campus hamlet centered on the historic Agenzia complex, while broader everyday errands and social life are usually handled in Bra.",
    transportSourceUrls: [
      "https://www.unisg.it/info/",
      "https://www.comune.bra.cn.it/it/page/trasporti-urbani-nuovi-percorsi",
      "https://www.unisg.it/cheese/edizione-2023/visit-pollenzo/",
    ],
    sourceRetrievedAt: "2026-08-21",
    sourceConfidence: "mixed",
    reviewStatus: "source-checked",
    reviewPriority: ["hamlet"],
    uncertain: [
      "Official UNISG pages do not describe the Bra-Pollenzo bus identically: one current page says buses from Bra station and center reach Pollenzo, while older or event-specific UNISG pages mention different line numbers. The exact current line numbering and stop labeling therefore remain uncertain.",
    ],
  },
] satisfies TieredCityRecord[];
