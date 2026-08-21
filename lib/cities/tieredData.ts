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
] satisfies TieredCityRecord[];
