// src/app/data.ts

export interface Department {
  name: string;
  slug: string;
}

export interface University {
  id: number;
  name: string;
  city: string;
  type: string;
  departments: Department[];
  fee: string;
  image: string;
  description: string;
  // 👇 Yeni Eklenen İngilizce Alanlar (Opsiyonel yaptım, hata vermesin diye)
  description_en?: string;
  website: string;
  features: string[];
  features_en?: string[];
}

export const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80";

export const universitiesData: University[] = [
  {
    id: 1,
    name: "Politecnico di Milano",
    city: "Milano",
    type: "Devlet",
    departments: [
      { name: "Architectural Design", slug: "architectural-design" },
      { name: "Civil Engineering", slug: "civil-engineering" },
      { name: "Interaction Design", slug: "interaction-design" },
      { name: "Mechanical Engineering", slug: "mechanical-engineering" },
      { name: "Industrial and Production Engineering", slug: "industrial-and-production-engineering" }
    ],
    fee: "150€ - 3.898€",
    image: "https://images.unsplash.com/photo-1588523641901-a18c795682e6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fG1pbGFub3xlbnwwfHwwfHx8MA%3D%3D",
    description: `İtalya'nın bir numaralı teknik üniversitesi. Mühendislik, mimarlık ve tasarım alanlarında dünya lideridir. Piacenza ve Mantova kampüslerinde de eğitim verir.`,
    description_en: `Italy's number one technical university. A world leader in engineering, architecture, and design. It also offers education at Piacenza and Mantova campuses.`,
    website: "https://www.polimi.it",
    features: ["QS #1 İtalya", "Teknik Eğitim", "Yüksek İş İmkanı"],
    features_en: ["QS #1 Italy", "Technical Education", "High Employability"]
  },
  {
    id: 2,
    name: "Sapienza University of Rome",
    city: "Roma",
    type: "Devlet",
    departments: [
      { name: "Applied Computer Science & AI (ACSAI)", slug: "applied-computer-science-and-ai-acsai" },
      { name: "Bioinformatics", slug: "bioinformatics" },
      { name: "Classics", slug: "classics" },
      { name: "Global Humanities", slug: "global-humanities" },
      { name: "Sustainable Building Engineering", slug: "sustainable-building-engineering" },
      { name: "Nursing", slug: "nursing" },
      { name: "Economics and Finance", slug: "economics-and-finance" },
      { name: "Business Sciences", slug: "business-sciences" },
      { name: "Environmental Engineering", slug: "environmental-engineering" },
      { name: "Applied Computer Science and Artificial Intelligence", slug: "applied-computer-science-and-artificial-intelligence" },
      { name: "Environmental Engineering for Sustainable Development", slug: "environmental-engineering-for-sustainable-development" },
      { name: "Oriental Languages and Civilizations", slug: "oriental-languages-and-civilizations" },
      { name: "Molecular Biology, Medicinal Chemistry and Computer Science for Pharmaceutical Applications", slug: "molecular-biology-medicinal-chemistry-and-computer-science-for-pharmaceutical-applications" }
    ],
    fee: "150€ - 2.924€",
    image: "https://images.unsplash.com/photo-1529154036614-a60975f5c760?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cm9tYXxlbnwwfHwwfHx8MA%3D%3D",
    description: `Roma'nın kalbinde, Avrupa'nın en büyük üniversitesi. 700 yıllık tarihiyle antik çağdan yapay zekaya kadar her alanda eğitim verir.`,
    description_en: `Located in the heart of Rome, it is Europe's largest university. With 700 years of history, it offers education in every field from antiquity to artificial intelligence.`,
    website: "https://www.uniroma1.it",
    features: ["700 Yıllık Tarih", "Başkent", "Geniş Bölüm Yelpazesi"],
    features_en: ["700 Years History", "Capital City", "Wide Range of Depts"]
  },
  {
    id: 3,
    name: "University of Bologna",
    city: "Bologna",
    type: "Devlet",
    departments: [
      { name: "Business and Economics (CLABE)", slug: "business-and-economics-clabe" },
      { name: "Economics and Finance (CLEF)", slug: "economics-and-finance-clef" },
      { name: "International Relations", slug: "international-relations" },
      { name: "Genomics", slug: "genomics" },
      { name: "Economics of Tourism", slug: "economics-of-tourism" },
      { name: "International Studies", slug: "international-studies" },
      { name: "Statistical Sciences", slug: "statistical-sciences" },
      { name: "Building Construction Engineering", slug: "building-construction-engineering" },
      { name: "Business and Economics", slug: "business-and-economics" },
      { name: "Business Economics", slug: "business-economics" },
      { name: "Economics and Finance", slug: "economics-and-finance" },
      { name: "Economics of Tourism and Cities", slug: "economics-of-tourism-and-cities" },
      { name: "Economics, Politics and Social Sciences", slug: "economics-politics-and-social-sciences" },
      { name: "European Studies", slug: "european-studies" },
      { name: "Management and Economics", slug: "management-and-economics" }
    ],
    fee: "150€ - 2.500€",
    image: "https://plus.unsplash.com/premium_photo-1677427230972-7cabe0d3e005?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Ym9sb2duYXxlbnwwfHwwfHx8MA%3D%3D",
    description: `Dünyanın en eski üniversitesi (1088). Tam bir öğrenci şehri ve akademik mükemmeliyet merkezi.`,
    description_en: `The oldest university in the world (1088). A true student city and a center of academic excellence.`,
    website: "https://www.unibo.it",
    features: ["Dünyanın En Eskisi", "Öğrenci Şehri", "Sosyal Bilimler"],
    features_en: ["World's Oldest", "Student City", "Social Sciences"]
  },
  {
    id: 4,
    name: "University of Padua",
    city: "Padova",
    type: "Devlet",
    departments: [
      { name: "Psychological Science", slug: "psychological-science" },
      { name: "Animal Care", slug: "animal-care" },
      { name: "Information Engineering", slug: "information-engineering" },
      { name: "Italian Medieval Renaissance", slug: "italian-medieval-renaissance" },
      { name: "Biology of Human and Environmental Health", slug: "biology-of-human-and-environmental-health" },
      { name: "Earth and Climate Dynamics", slug: "earth-and-climate-dynamics" },
      { name: "Health Assistance", slug: "health-assistance" },
      { name: "Automation and System Engineering", slug: "automation-and-system-engineering" },
      { name: "Internet, Multimedia and Telecommunications Engineering", slug: "internet-multimedia-and-telecommunications-engineering" },
      { name: "Italian Medieval and Renaissance Studies", slug: "italian-medieval-and-renaissance-studies" },
      { name: "Techniques and Methods in Psychological Science", slug: "techniques-and-methods-in-psychological-science" }
    ],
    fee: "150€ - 2.600€",
    image: "https://images.unsplash.com/photo-1584699232068-ab0eabccc805?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Galileo Galilei'nin ders verdiği, İtalya'nın en eski ikinci üniversitesi. Psikolojide liderdir.`,
    description_en: `Italy's second oldest university, where Galileo Galilei taught. A leader in Psychology.`,
    website: "https://www.unipd.it",
    features: ["Psikolojide Lider", "Venedik'e Yakın", "Köklü Tarih"],
    features_en: ["Leader in Psychology", "Near Venice", "Deep History"]
  },
  {
    id: 5,
    name: "Politecnico di Torino",
    city: "Torino",
    type: "Devlet",
    departments: [
      { name: "Automotive Engineering", slug: "automotive-engineering" },
      { name: "Computer Engineering", slug: "computer-engineering" },
      { name: "Electronic and Communications Engineering", slug: "electronic-and-communications-engineering" },
      { name: "Mechanical Engineering", slug: "mechanical-engineering" },
      { name: "Architecture", slug: "architecture" },
      { name: "Civil and Environmental Engineering", slug: "civil-and-environmental-engineering" }
    ],
    fee: "150€ - 2.600€",
    image: "https://images.unsplash.com/photo-1610651219730-6b580d616e72?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `İtalya'nın otomotiv başkenti Torino'da yer alır. Mühendislik ve mimarlıkta Avrupa devidir.`,
    description_en: `Located in Turin, Italy's automotive capital. A European giant in engineering and architecture.`,
    website: "https://www.polito.it",
    features: ["Otomotivin Kalbi", "Teknokent Kampüsü", "Endüstri Bağlantıları"],
    features_en: ["Automotive Hub", "Tech Campus", "Industry Links"]
  },
  {
    id: 6,
    name: "Free University of Bozen-Bolzano",
    city: "Bolzano",
    type: "Devlet",
    departments: [
      { name: "Sustainable Agriculture and Forestry", slug: "sustainable-agriculture-and-forestry" },
      { name: "Design and Art", slug: "design-and-art" },
      { name: "Economics and Management", slug: "economics-and-management" },
      { name: "Computer Science", slug: "computer-science" },
      { name: "Wood Technology", slug: "wood-technology" },
      { name: "Food and Enogastronomy Sciences", slug: "food-and-enogastronomy-sciences" },
      { name: "Sustainable Agriculture and Forestry in Mountain Environments", slug: "sustainable-agriculture-and-forestry-in-mountain-environments" },
      { name: "Economics, Politics and Ethics", slug: "economics-politics-and-ethics" },
      { name: "Informatics and Management of Digital Business", slug: "informatics-and-management-of-digital-business" },
      { name: "Electronic and Information Engineering", slug: "electronic-and-information-engineering" },
      { name: "Industrial and Mechanical Engineering", slug: "industrial-and-mechanical-engineering" },
      { name: "Tourism, Sport and Event Management", slug: "tourism-sport-and-event-management" },
      { name: "Social Education", slug: "social-education" },
      { name: "Communication Sciences and Culture", slug: "communication-sciences-and-culture" },
      { name: "Social Work", slug: "social-work" }
    ],
    fee: "150€ - 1.350€",
    image: "https://plus.unsplash.com/premium_photo-1736063854328-48347237635a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Alplerin kalbinde, üç dilli (İtalyanca, Almanca, İngilizce) eğitim veren zengin ve butik üniversite.`,
    description_en: `In the heart of the Alps, a rich and boutique university offering trilingual education (Italian, German, English).`,
    website: "https://www.unibz.it",
    features: ["Üç Dilli Eğitim", "Yüksek İstihdam", "Modern Tesisler"],
    features_en: ["Trilingual Education", "High Employment", "Modern Facilities"]
  },
  {
    id: 7,
    name: "Bocconi University",
    city: "Milano",
    type: "Özel",
    departments: [
      { name: "International Economics and Management", slug: "international-economics-and-management" },
      { name: "International Economics and Finance", slug: "international-economics-and-finance" },
      { name: "Economic and Social Sciences", slug: "economic-and-social-sciences" },
      { name: "Economics, Management and Computer Science", slug: "economics-management-and-computer-science" },
      { name: "Mathematical and Computing Sciences for AI", slug: "mathematical-and-computing-sciences-for-ai" },
      { name: "World Bachelor in Business", slug: "world-bachelor-in-business" },
      { name: "Business (World Bachelor in Business)", slug: "business-world-bachelor-in-business" },
      { name: "Economics and Management for Arts, Culture and Communication", slug: "economics-and-management-for-arts-culture-and-communication" },
      { name: "Global Law", slug: "global-law" },
      { name: "International Politics and Government", slug: "international-politics-and-government" },
      { name: "Mathematical and Computing Sciences for Artificial Intelligence", slug: "mathematical-and-computing-sciences-for-artificial-intelligence" }
    ],
    fee: "14.000€ - 16.500€",
    image: "https://images.unsplash.com/photo-1595193284747-a1e41bae7746?q=80&w=1343&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Avrupa'nın en prestijli ekonomi okulu. Mezunları doğrudan küresel finans merkezlerinde iş bulur.`,
    description_en: `Europe's most prestigious economics school. Graduates find jobs directly in global financial centers.`,
    website: "https://www.unibocconi.eu",
    features: ["Elit Ekonomi", "Güçlü Network", "Prestij"],
    features_en: ["Elite Economics", "Strong Network", "Prestige"]
  },
  {
    id: 8,
    name: "Università Cattolica del Sacro Cuore",
    city: "Milano",
    type: "Özel",
    departments: [
      { name: "Economics and Management", slug: "economics-and-management" },
      { name: "International Relations and Global Affairs", slug: "international-relations-and-global-affairs" },
      { name: "Psychology", slug: "psychology" },
      { name: "Food Production Management", slug: "food-production-management" },
      { name: "Medicine (Roma)", slug: "medicine-roma" },
      { name: "Communication and Society", slug: "communication-and-society" },
      { name: "Business and Finance", slug: "business-and-finance" },
      { name: "Business Administration", slug: "business-administration" },
      { name: "Food Science and Technology", slug: "food-science-and-technology" },
      { name: "Political Sciences and International Relations", slug: "political-sciences-and-international-relations" },
      { name: "Sociology", slug: "sociology" }
    ],
    fee: "3.000€ - 9.000€",
    image: "https://plus.unsplash.com/premium_photo-1677097570196-0d81ee690408?q=80&w=988&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Avrupa'nın en büyük özel üniversitesi. Farklı şehirlerde kampüsleri ve güçlü endüstri bağları vardır.`,
    description_en: `Europe's largest private university. It has campuses in different cities and strong industrial ties.`,
    website: "https://www.unicatt.eu",
    features: ["Çok Kampüslü", "Özel İlgi", "Geniş Ağ"],
    features_en: ["Multi-Campus", "Private Attention", "Wide Network"]
  },
  {
    id: 9,
    name: "Ca' Foscari University of Venice",
    city: "Venedik",
    type: "Devlet",
    departments: [
      { name: "Digital Management", slug: "digital-management" },
      { name: "Economics and Business", slug: "economics-and-business" },
      { name: "Philosophy, International and Economic Studies", slug: "philosophy-international-and-economic-studies" },
      { name: "Hospitality Innovation and E-Tourism", slug: "hospitality-innovation-and-e-tourism" },
      { name: "Computer Science", slug: "computer-science" },
      { name: "Business Administration and Management", slug: "business-administration-and-management" },
      { name: "Languages, Cultures and Societies of Asia and Mediterranean Africa", slug: "languages-cultures-and-societies-of-asia-and-mediterranean-africa" }
    ],
    fee: "150€ - 2.300€",
    image: "https://images.pexels.com/photos/26555694/pexels-photo-26555694.jpeg",
    description: `Venedik kanalları üzerinde eğitim. Ekonomi, diller ve dijital yönetim alanlarında uzmanlaşmıştır.`,
    description_en: `Education on the canals of Venice. Specialized in economics, languages, and digital management.`,
    website: "https://www.unive.it",
    features: ["Venedik Kampüsü", "Dil ve Kültür", "H-FARM (Digital)"],
    features_en: ["Venice Campus", "Lang & Culture", "H-FARM (Digital)"]
  },
  {
    id: 10,
    name: "University of Milan (Statale)",
    city: "Milano",
    type: "Devlet",
    departments: [
      { name: "International Politics, Law and Economics (IPLE)", slug: "international-politics-law-and-economics-iple" },
      { name: "Artificial Intelligence", slug: "artificial-intelligence" },
      { name: "Political Sciences", slug: "political-sciences" },
      { name: "Economics: Behavior, Data and Policy", slug: "economics-behavior-data-and-policy" },
      { name: "Medical Biotechnology", slug: "medical-biotechnology" },
      { name: "Ancient Civilizations for the Contemporary World", slug: "ancient-civilizations-for-the-contemporary-world" }
    ],
    fee: "150€ - 4.000€",
    image: "https://images.unsplash.com/photo-1617102827974-c3f440b2ed70?q=80&w=2063&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Milano'nun merkezindeki dev devlet üniversitesi. Siyaset bilimi ve hukuk alanında çok güçlüdür.`,
    description_en: `A giant public university in the center of Milan. Very strong in political science and law.`,
    website: "https://www.unimi.it",
    features: ["Merkezi Konum", "Siyaset Bilimi", "Araştırma"],
    features_en: ["Central Location", "Political Sci", "Research"]
  },
  {
    id: 11,
    name: "University of Turin",
    city: "Torino",
    type: "Devlet",
    departments: [
      { name: "Global Law and Transnational Legal Studies", slug: "global-law-and-transnational-legal-studies" },
      { name: "Business & Management", slug: "business-and-management" },
      { name: "Biotechnology", slug: "biotechnology" },
      { name: "Economics", slug: "economics" },
      { name: "Economics and Finance with Data Science", slug: "economics-and-finance-with-data-science" },
      { name: "Mathematics for Economics, Finance and Insurance", slug: "mathematics-for-economics-finance-and-insurance" }
    ],
    fee: "150€ - 2.800€",
    image: "https://images.unsplash.com/photo-1569355849432-0ed9d0a55bf5?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Torino'nun köklü üniversitesi. Hukuk (Global Law) ve işletme alanında İngilizce programları popülerdir.`,
    description_en: `Turin's historic university. English programs in Law (Global Law) and business are popular.`,
    website: "https://www.unito.it",
    features: ["Hukukta Öncü", "Kraliyet Mimarisi", "Geniş Kampüs"],
    features_en: ["Leader in Law", "Royal Architecture", "Large Campus"]
  },
  {
    id: 12,
    name: "Luiss Guido Carli",
    city: "Roma",
    type: "Özel",
    departments: [
      { name: "Management & Computer Science", slug: "management-and-computer-science" },
      { name: "Politics: Philosophy and Economics (PPE)", slug: "politics-philosophy-and-economics-ppe" },
      { name: "Business Administration", slug: "business-administration" },
      { name: "Global Law", slug: "global-law" },
      { name: "Management and AI", slug: "management-and-ai" },
      { name: "Economics and Business", slug: "economics-and-business" },
      { name: "Management and Artificial Intelligence", slug: "management-and-artificial-intelligence" },
      { name: "Politics: Philosophy and Economics", slug: "politics-philosophy-and-economics" }
    ],
    fee: "11.000€ - 12.000€",
    image: "https://images.unsplash.com/photo-1548585742-1df49e753a83?q=80&w=2077&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `İtalyan Sanayiciler Birliği tarafından kurulan, iş dünyası ve siyasetle iç içe elit bir üniversite.`,
    description_en: `Founded by the Confederation of Italian Industry, an elite university intertwined with business and politics.`,
    website: "https://www.luiss.edu",
    features: ["İş Dünyası Ağı", "Lüks Kampüs", "Siyaset Bilimi"],
    features_en: ["Business Network", "Luxury Campus", "Political Sci"]
  },
  {
    id: 13,
    name: "University of Rome Tor Vergata",
    city: "Roma",
    type: "Devlet",
    departments: [
      { name: "Global Governance", slug: "global-governance" },
      { name: "Engineering Sciences", slug: "engineering-sciences" },
      { name: "Business Administration & Economics", slug: "business-administration-and-economics" },
      { name: "Tourism Sciences", slug: "tourism-sciences" }
    ],
    fee: "150€ - 2.500€",
    image: "https://plus.unsplash.com/premium_photo-1675975706513-9daba0ec12a8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Roma'nın modern kampüs üniversitesi. Global Governance bölümü disiplinlerarası yapısıyla ünlüdür.`,
    description_en: `Rome's modern campus university. Famous for its interdisciplinary Global Governance program.`,
    website: "https://web.uniroma2.it",
    features: ["Global Governance", "Modern Kampüs", "Disiplinlerarası"],
    features_en: ["Global Governance", "Modern Campus", "Interdisciplinary"]
  },
  {
    id: 14,
    name: "University of Naples Federico II",
    city: "Napoli",
    type: "Devlet",
    departments: [
      { name: "Biology for One-Health", slug: "biology-for-one-health" },
      { name: "Civil and Environmental Engineering", slug: "civil-and-environmental-engineering" },
      { name: "Hospitality Management", slug: "hospitality-management" },
      { name: "Precision Livestock Farming", slug: "precision-livestock-farming" },
      { name: "Community Design", slug: "community-design" }
    ],
    fee: "150€ - 2.500€",
    image: "https://images.unsplash.com/photo-1642263975707-8118ed3ff145?q=80&w=2029&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Dünyanın en eski devlet üniversitesi (1224). Napoli'nin canlı kültürü ve Apple Academy ile ünlüdür.`,
    description_en: `The world's oldest public university (1224). Famous for Naples' vibrant culture and the Apple Academy.`,
    website: "https://www.unina.it",
    features: ["Apple Academy", "Tarihi Şehir", "Ekonomik Yaşam"],
    features_en: ["Apple Academy", "Historic City", "Affordable Living"]
  },
  {
    id: 15,
    name: "University of Pavia",
    city: "Pavia",
    type: "Devlet",
    departments: [
      { name: "Artificial Intelligence", slug: "artificial-intelligence" },
      { name: "Medicine (6 Yıl)", slug: "medicine-6-y-l" },
      { name: "Bioengineering", slug: "bioengineering" },
      { name: "Social Sciences for Global Challenges", slug: "social-sciences-for-global-challenges" }
    ],
    fee: "150€ - 4.500€",
    image: "https://images.unsplash.com/photo-1679098419872-77cb6eb24e46?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Milano'ya yakın, kolej (yurt) sistemiyle yönetilen, tıpta ve mühendislikte güçlü tarihi okul.`,
    description_en: `Close to Milan, a historic school with a collegiate system, strong in medicine and engineering.`,
    website: "https://web.unipv.it",
    features: ["Kolej Sistemi", "Yapay Zeka", "Tıpta Güçlü"],
    features_en: ["Collegiate System", "AI", "Strong in Med"]
  },
  {
    id: 16,
    name: "University of Siena",
    city: "Siena",
    type: "Devlet",
    departments: [
      { name: "Economics and Banking", slug: "economics-and-banking" },
      { name: "Economics and Management", slug: "economics-and-management" },
      { name: "Dentistry (Diş Hekimliği)", slug: "dentistry-di-hekimli-i" },
      { name: "Biotech Engineering for Health", slug: "biotech-engineering-for-health" }
    ],
    fee: "150€ - 2.200€",
    image: "https://images.unsplash.com/photo-1612820676918-1682b0d4afa0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Bankacılık tarihinin başladığı şehir. Orta çağ atmosferinde güvenli bir eğitim ortamı sunar.`,
    description_en: `The city where banking history began. Offers a safe educational environment in a medieval atmosphere.`,
    website: "https://en.unisi.it",
    features: ["Orta Çağ Atmosferi", "Güvenli Şehir", "Finans"],
    features_en: ["Medieval Vibes", "Safe City", "Finance"]
  },
  {
    id: 17,
    name: "University of Messina",
    city: "Messina",
    type: "Devlet",
    departments: [
      { name: "Data Analysis", slug: "data-analysis" },
      { name: "Political Sciences", slug: "political-sciences" },
      { name: "Medicine (6 Yıl)", slug: "medicine-6-y-l" },
      { name: "Civil Engineering", slug: "civil-engineering" },
      { name: "Marine Biology", slug: "marine-biology" },
      { name: "Computer Science", slug: "computer-science" },
      { name: "Biotechnology", slug: "biotechnology" },
      { name: "Economics, Banking and Finance", slug: "economics-banking-and-finance" },
      { name: "Business Management", slug: "business-management" },
      { name: "Marine Biology and Blue Biotechnologies", slug: "marine-biology-and-blue-biotechnologies" },
      { name: "Political Sciences and International Relations", slug: "political-sciences-and-international-relations" },
      { name: "Transnational and European Legal Studies", slug: "transnational-and-european-legal-studies" }
    ],
    fee: "150€ - 750€",
    image: "https://images.unsplash.com/photo-1558652361-3d3b72a5dc79?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Sicilya'nın boğaz manzaralı şehri. Uygun fiyatlı yaşam ve geniş İngilizce bölüm seçenekleri.`,
    description_en: `A Sicilian city with strait views. Affordable living and a wide range of English programs.`,
    website: "https://international.unime.it",
    features: ["Deniz Manzarası", "Ekonomik", "Veri Analizi"],
    features_en: ["Sea View", "Affordable", "Data Analysis"]
  },
  {
    id: 18,
    name: "University of Trento",
    city: "Trento",
    type: "Devlet",
    departments: [
      { name: "Computer Science", slug: "computer-science" },
      { name: "Comparative Legal Studies", slug: "comparative-legal-studies" },
      { name: "Biomolecular Sciences", slug: "biomolecular-sciences" },
      { name: "Computer & Electronic Engineering", slug: "computer-and-electronic-engineering" },
      { name: "Computer, Communications and Electronic Engineering", slug: "computer-communications-and-electronic-engineering" },
      { name: "Biomolecular Sciences and Technology", slug: "biomolecular-sciences-and-technology" },
      { name: "Comparative, European and International Legal Studies", slug: "comparative-european-and-international-legal-studies" }
    ],
    fee: "150€ - 2.000€",
    image: "https://images.unsplash.com/photo-1681477421173-804e57cda0e5?q=80&w=2038&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `İtalya'nın yaşam kalitesi en yüksek şehrinde, özellikle bilgisayar ve hukuk alanında üst düzey eğitim.`,
    description_en: `Top-level education, especially in CS and law, in Italy's city with the highest quality of life.`,
    website: "https://www.unitn.it",
    features: ["Yüksek Yaşam Kalitesi", "Doğa", "Bilişim Lideri"],
    features_en: ["High QoL", "Nature", "IT Leader"]
  },
  {
    id: 19,
    name: "University of Pisa",
    city: "Pisa",
    type: "Devlet",
    departments: [
      { name: "Humanities (IPM)", slug: "humanities-ipm" },
      { name: "Management for Business and Economics", slug: "management-for-business-and-economics" },
      { name: "Geology", slug: "geology" },
      { name: "Cultural Heritage Studies", slug: "cultural-heritage-studies" },
      { name: "Studies in Performing Arts and Communication", slug: "studies-in-performing-arts-and-communication" },
      { name: "Historical Studies", slug: "historical-studies" }
    ],
    fee: "150€ - 2.400€",
    image: "https://images.pexels.com/photos/20296310/pexels-photo-20296310.jpeg",
    description: `Galileo'nun şehri. Humanities bölümü sözelciler için eşsizdir. Tarihi dokusu büyüleyicidir.`,
    description_en: `Galileo's city. The Humanities program is unique for arts students. Historic texture is mesmerizing.`,
    website: "https://www.unipi.it",
    features: ["Humanities", "Tarihi Şehir", "Akademik Gelenek"],
    features_en: ["Humanities", "Historic City", "Tradition"]
  },
  {
    id: 20,
    name: "University of Genoa",
    city: "Cenova",
    type: "Devlet",
    departments: [
      { name: "Maritime Science and Technology", slug: "maritime-science-and-technology" },
      { name: "Computer Engineering", slug: "computer-engineering" },
      { name: "Engineering Technology for Strategy", slug: "engineering-technology-for-strategy" },
      { name: "Computer Engineering (Sede Imperia)", slug: "computer-engineering-sede-imperia" }
    ],
    fee: "0€ - 3.000€",
    image: "https://images.unsplash.com/photo-1601047197922-156024782afd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `İtalya'nın en büyük liman kenti. Denizcilik, gemi mühendisliği ve robotik alanında rakipsizdir.`,
    description_en: `Italy's largest port city. Unrivaled in maritime, naval engineering, and robotics.`,
    website: "https://unige.it",
    features: ["Denizcilik Lideri", "Liman Kenti", "Mühendislik"],
    features_en: ["Maritime Leader", "Port City", "Engineering"]
  },
  {
    id: 21,
    name: "University of Trieste",
    city: "Trieste",
    type: "Devlet",
    departments: [
      { name: "Earth Sciences", slug: "earth-sciences" },
      { name: "Business Administration", slug: "business-administration" },
      { name: "International Economics", slug: "international-economics" },
      { name: "Industrial Engineering", slug: "industrial-engineering" },
      { name: "Earth Sciences for Sustainable Development", slug: "earth-sciences-for-sustainable-development" },
      { name: "Business Administration and Management", slug: "business-administration-and-management" },
      { name: "International Economics and Financial Markets", slug: "international-economics-and-financial-markets" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1676706980757-e3b5d6c16321?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `İtalya'nın doğu kapısı Trieste'de, uluslararası ticaret, fizik ve mühendislik alanlarında güçlüdür.`,
    description_en: `At Italy's eastern gate, Trieste is strong in international trade, physics, and engineering.`,
    website: "https://www.units.it",
    features: ["Liman Kenti", "Fizik ve Ekonomi", "Sınır Şehri"],
    features_en: ["Port City", "Physics & Econ", "Border City"]
  },
  {
    id: 22,
    name: "Marche Polytechnic University",
    city: "Ancona",
    type: "Devlet",
    departments: [
      { name: "Dietistic", slug: "dietistic" },
      { name: "Digital Economics", slug: "digital-economics" },
      { name: "Dental Hygiene", slug: "dental-hygiene" },
      { name: "Environmental Sciences", slug: "environmental-sciences" },
      { name: "Imaging and Radiotherapy", slug: "imaging-and-radiotherapy" },
      { name: "Midwifery", slug: "midwifery" },
      { name: "Digital Economics and Business", slug: "digital-economics-and-business" },
      { name: "Environmental Sciences and Civil Protection", slug: "environmental-sciences-and-civil-protection" },
      { name: "Imaging and Radiotherapy Techniques", slug: "imaging-and-radiotherapy-techniques" }
    ],
    fee: "150€ - 3.000€",
    image: "https://plus.unsplash.com/premium_photo-1677048148083-99e9f8eb12a5?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Adriyatik kıyısında, özellikle sağlık bilimleri ve mühendislik alanında teknik eğitim verir.`,
    description_en: `Located on the Adriatic coast, providing technical education especially in health sciences and engineering.`,
    website: "https://www.univpm.it",
    features: ["Sağlık Bilimleri", "Teknik Eğitim", "Deniz Kenarı"],
    features_en: ["Health Sciences", "Technical Edu", "Seaside"]
  },
  {
    id: 23,
    name: "University of Parma",
    city: "Parma",
    type: "Devlet",
    departments: [
      { name: "Dental Hygiene", slug: "dental-hygiene" },
      { name: "Global Studies for Sustainable Development", slug: "global-studies-for-sustainable-development" },
      { name: "Global Studies for Sustainable Local and International Development and Cooperation", slug: "global-studies-for-sustainable-local-and-international-development-and-cooperation" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1603056740028-4291336263c8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Gıda vadisinin kalbinde, yaşam kalitesi yüksek Parma şehrinde köklü bir eğitim kurumu.`,
    description_en: `A historic institution in the heart of the Food Valley, in the high-quality city of Parma.`,
    website: "https://www.unipr.it",
    features: ["Gıda Vadisi", "Yaşam Kalitesi", "Sürdürülebilirlik"],
    features_en: ["Food Valley", "Quality of Life", "Sustainability"]
  },
  {
    id: 24,
    name: "Vanvitelli University",
    city: "Napoli / Caserta",
    type: "Devlet",
    departments: [
      { name: "Nursing", slug: "nursing" },
      { name: "Data Analytics", slug: "data-analytics" },
      { name: "Medicine (6 Yıl)", slug: "medicine-6-y-l" }
    ],
    fee: "150€ - 2.000€",
    image: "https://images.unsplash.com/photo-1586108683830-eee157a26bdb?q=80&w=1036&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Güney İtalya'da, özellikle Hemşirelik ve Veri Analitiği gibi niş İngilizce bölümleriyle öne çıkar.`,
    description_en: `Stand out in Southern Italy with niche English programs like Nursing and Data Analytics.`,
    website: "https://www.unicampania.it",
    features: ["Hemşirelik", "Güney İtalya", "Sıcak İklim"],
    features_en: ["Nursing", "South Italy", "Warm Climate"]
  },
  {
    id: 25,
    name: "University of Palermo",
    city: "Palermo",
    type: "Devlet",
    departments: [
      { name: "Economics and Finance", slug: "economics-and-finance" },
      { name: "Economics & International Cooperation", slug: "economics-and-international-cooperation" },
      { name: "Electronics Engineering", slug: "electronics-engineering" },
      { name: "Management Engineering", slug: "management-engineering" },
      { name: "Nursing", slug: "nursing" },
      { name: "Economics, International Cooperation and Sustainable Development", slug: "economics-international-cooperation-and-sustainable-development" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1586729223498-2cc4a05d3858?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Sicilya'nın başkentinde, Akdeniz kültürünün merkezinde geniş yelpazeli İngilizce eğitim.`,
    description_en: `Wide range of English education in the capital of Sicily, the center of Mediterranean culture.`,
    website: "https://www.unipa.it",
    features: ["Akdeniz Kültürü", "Ekonomi", "Mühendislik"],
    features_en: ["Medit. Culture", "Economics", "Engineering"]
  },
  {
    id: 26,
    name: "University of Bergamo",
    city: "Bergamo",
    type: "Devlet",
    departments: [
      { name: "Business Administration", slug: "business-administration" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1722068326894-405c682d6933?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Milano'ya yakın, tarihi ve sanayi açısından zengin bir şehirde işletme eğitimi.`,
    description_en: `Business education in a city rich in history and industry, close to Milan.`,
    website: "https://www.unibg.it",
    features: ["Sanayi Şehri", "İşletme", "Tarihi Merkez"],
    features_en: ["Industrial City", "Business", "Historic Center"]
  },
  {
    id: 27,
    name: "University of Brescia",
    city: "Brescia",
    type: "Devlet",
    departments: [
      { name: "Business and Economics", slug: "business-and-economics" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1718120744257-65c98b102c6b?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Lombardiya'nın önemli sanayi kentlerinden Brescia'da ekonomi ve iş dünyası odaklı eğitim.`,
    description_en: `Economy and business-focused education in Brescia, one of Lombardy's key industrial cities.`,
    website: "https://www.unibs.it",
    features: ["Ekonomi", "Sanayi", "Kuzey İtalya"],
    features_en: ["Economics", "Industry", "North Italy"]
  },
  {
    id: 28,
    name: "University of Verona",
    city: "Verona",
    type: "Devlet",
    departments: [
      { name: "Computer Engineering for Robotic and Intelligent Systems", slug: "computer-engineering-for-robotic-and-intelligent-systems" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1555796861-b29396df890e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Romeo ve Juliet'in şehrinde, robotik ve akıllı sistemler üzerine ileri teknoloji eğitimi.`,
    description_en: `High-tech education on robotics and intelligent systems in the city of Romeo and Juliet.`,
    website: "https://www.univr.it",
    features: ["Robotik", "Akıllı Sistemler", "Tarihi Şehir"],
    features_en: ["Robotics", "Smart Systems", "Historic City"]
  },
  {
    id: 29,
    name: "University of Milano-Bicocca",
    city: "Milano",
    type: "Devlet",
    departments: [
      { name: "Economics and Science for Environmental Sustainability", slug: "economics-and-science-for-environmental-sustainability" },
      { name: "Physical Sciences for Innovative Technologies", slug: "physical-sciences-for-innovative-technologies" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1513581166391-887a96ddeafd?auto=format&fit=crop&w=800&q=80",
    description: `Milano'nun modern kampüs üniversitesi. Sürdürülebilirlik ve teknolojik inovasyon odaklıdır.`,
    description_en: `Milan's modern campus university. Focused on sustainability and technological innovation.`,
    website: "https://www.unimib.it",
    features: ["Sürdürülebilirlik", "Gelecek Odaklı", "Modern Kampüs"],
    features_en: ["Sustainability", "Future Focused", "Modern Campus"]
  },
  {
    id: 30,
    name: "University of Camerino",
    city: "Camerino",
    type: "Devlet",
    departments: [
      { name: "Biosciences and Biotechnology", slug: "biosciences-and-biotechnology" },
      { name: "Gastronomic Sciences", slug: "gastronomic-sciences" }
    ],
    fee: "156€ flat tax",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Tepenin üzerine kurulu masalsı bir şehir. Biyoteknoloji ve gastronomi alanında İngilizce eğitim verir.`,
    description_en: `A fairy-tale city built on a hill. Offers English education in biotechnology and gastronomy.`,
    website: "https://www.unicam.it",
    features: ["Tarihi Tepe Şehri", "Biyobilimler", "Sakin Ortam"],
    features_en: ["Hilltop City", "Biosciences", "Quiet Env."]
  },
  {
    id: 31,
    name: "University of Cassino",
    city: "Cassino",
    type: "Devlet",
    departments: [
      { name: "Economics and Business", slug: "economics-and-business" },
      { name: "Global Economy", slug: "global-economy" },
      { name: "Industrial Engineering", slug: "industrial-engineering" },
      { name: "Economics with Data Science", slug: "economics-with-data-science" },
      { name: "Industrial Engineering Technology", slug: "industrial-engineering-technology" }
    ],
    fee: "150€ - 1.800€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Roma ve Napoli arasında, yaşam maliyeti uygun olan küçük bir öğrenci şehri.`,
    description_en: `A small student city with affordable cost of living, located between Rome and Naples.`,
    website: "https://www.unicas.it",
    features: ["Ekonomik Yaşam", "Roma'ya Yakın", "Butik Kampüs"],
    features_en: ["Affordable", "Near Rome", "Boutique Campus"]
  },
  {
    id: 32,
    name: "University of Tuscia",
    city: "Viterbo",
    type: "Devlet",
    departments: [
      { name: "Design", slug: "design" },
      { name: "Agricultural Sciences", slug: "agricultural-sciences" },
      { name: "Food and Wine Technologies", slug: "food-and-wine-technologies" },
      { name: "Forestry", slug: "forestry" },
      { name: "Forestry and Environmental Sciences", slug: "forestry-and-environmental-sciences" },
      { name: "Agricultural and Environmental Sciences", slug: "agricultural-and-environmental-sciences" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Roma'ya yakın, doğa bilimleri ve tarım teknolojileri konusunda uzmanlaşmış butik bir üniversite.`,
    description_en: `A boutique university near Rome specialized in natural sciences and agricultural technologies.`,
    website: "https://www.unitus.it",
    features: ["Tarım ve Orman", "Doğa Dostu", "Butik Eğitim"],
    features_en: ["Agri & Forestry", "Eco-Friendly", "Boutique Edu"]
  },
  {
    id: 33,
    name: "University of Perugia",
    city: "Perugia",
    type: "Devlet",
    departments: [
      { name: "Engineering Management", slug: "engineering-management" },
      { name: "Optics and Optometry", slug: "optics-and-optometry" },
      { name: "Programming and Management of Computer Systems", slug: "programming-and-management-of-computer-systems" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `İtalya'nın yeşil kalbi Umbria'da, tarihi ve canlı bir öğrenci şehri.`,
    description_en: `A historic and vibrant student city in Umbria, the green heart of Italy.`,
    website: "https://www.unipg.it",
    features: ["Öğrenci Şehri", "Mühendislik", "Tarihi Doku"],
    features_en: ["Student City", "Engineering", "Historic"]
  },
  {
    id: 34,
    name: "University for Foreigners of Perugia",
    city: "Perugia",
    type: "Devlet",
    departments: [
      { name: "Social Sciences for Sustainability", slug: "social-sciences-for-sustainability" },
      { name: "Social Sciences for Sustainability and International Cooperation", slug: "social-sciences-for-sustainability-and-international-cooperation" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Uluslararası öğrenciler için kurulmuş, sosyal bilimler ve İtalyan kültürü üzerine uzmanlaşmış merkez.`,
    description_en: `Established for international students, specialized in social sciences and Italian culture.`,
    website: "https://www.unistrapg.it",
    features: ["Uluslararası Ortam", "Sosyal Bilimler", "Öğrenci Şehri"],
    features_en: ["Int'l Environment", "Social Sciences", "Student City"]
  },
  {
    id: 35,
    name: "University of Naples Parthenope",
    city: "Napoli",
    type: "Devlet",
    departments: [
      { name: "Business Administration", slug: "business-administration" },
      { name: "International Business", slug: "international-business" },
      { name: "Tourist Firm Management", slug: "tourist-firm-management" },
      { name: "Sustainable Blue Economy", slug: "sustainable-blue-economy" },
      { name: "International Business Administration and Management", slug: "international-business-administration-and-management" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Napoli'nin denizcilik ve ekonomi geleneğine dayanan, işletme ve mavi ekonomi odaklı üniversite.`,
    description_en: `Based on Naples' maritime and economic tradition, focused on business and blue economy.`,
    website: "https://www.uniparthenope.it",
    features: ["Mavi Ekonomi", "Denizcilik", "İşletme"],
    features_en: ["Blue Economy", "Maritime", "Business"]
  },
  {
    id: 36,
    name: "University of Salento",
    city: "Lecce",
    type: "Devlet",
    departments: [
      { name: "Digital Management", slug: "digital-management" }
    ],
    fee: "150€ - 2.500€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Güneyin Floransa'sı Lecce'de, dijital dönüşüm ve yönetim üzerine odaklanan modern bir program.`,
    description_en: `A modern program focused on digital transformation in Lecce, the Florence of the South.`,
    website: "https://www.unisalento.it",
    features: ["Barok Şehir", "Dijital Yönetim", "Güney İtalya"],
    features_en: ["Baroque City", "Digital Mgmt", "South Italy"]
  },
  {
    id: 37,
    name: "University of Udine",
    city: "Udine",
    type: "Devlet",
    departments: [
      { name: "Management & Business Analytics", slug: "management-and-business-analytics" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Veri analitiği ve işletme yönetimini birleştiren, iş dünyasının ihtiyacına yönelik modern bir program.`,
    description_en: `Combines data analytics and business management, tailored to industry needs.`,
    website: "https://www.uniud.it",
    features: ["Veri Analizi", "İşletme", "Kuzeydoğu İtalya"],
    features_en: ["Data Analysis", "Business", "Northeast Italy"]
  },
  {
    id: 38,
    name: "University of Macerata",
    city: "Macerata",
    type: "Devlet",
    departments: [
      { name: "International, European and Comparative Legal Studies", slug: "international-european-and-comparative-legal-studies" },
      { name: "International, European and Comparative Legal Studies (IECOLS)", slug: "international-european-and-comparative-legal-studies-iecols" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Tamamen hukuka ve sosyal bilimlere odaklanmış tarihi bir üniversite.`,
    description_en: `A historic university focused entirely on law and social sciences.`,
    website: "https://www.unimc.it",
    features: ["Sadece Sosyal Bilimler", "Hukuk", "Tarihi Kampüs"],
    features_en: ["Social Sci Only", "Law", "Historic Campus"]
  },
  {
    id: 39,
    name: "University of Urbino Carlo Bo",
    city: "Urbino",
    type: "Devlet",
    departments: [
      { name: "Economics and Management", slug: "economics-and-management" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Rönesans'ın beşiği Urbino'da, UNESCO mirası bir şehirde butik ekonomi eğitimi.`,
    description_en: `Boutique economics education in Urbino, the cradle of the Renaissance and a UNESCO site.`,
    website: "https://www.uniurb.it",
    features: ["Rönesans Şehri", "Ekonomi", "UNESCO Mirası"],
    features_en: ["Renaissance City", "Economics", "UNESCO Heritage"]
  },
  {
    id: 40,
    name: "University of Sassari",
    city: "Sassari",
    type: "Devlet",
    departments: [
      { name: "Computer Engineering", slug: "computer-engineering" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Sardinya'nın kuzeyinde, modern bilişim teknolojileri ve sistem tasarımı üzerine odaklanan lisans.`,
    description_en: `Focused on modern IT and system design in northern Sardinia.`,
    website: "https://www.uniss.it",
    features: ["Bilişim", "Sardinya", "3 Yıllık"],
    features_en: ["IT", "Sardinia", "3 Years"]
  },
  {
    id: 41,
    name: "UniCamillus",
    city: "Roma",
    type: "Özel",
    departments: [
      { name: "Medicine", slug: "medicine" },
      { name: "Physiotherapy", slug: "physiotherapy" },
      { name: "Nursing", slug: "nursing" },
      { name: "Midwifery", slug: "midwifery" },
      { name: "Biomedical Lab Techniques", slug: "biomedical-lab-techniques" },
      { name: "Radiotherapy Techniques", slug: "radiotherapy-techniques" },
      { name: "Biomedical Laboratory Techniques", slug: "biomedical-laboratory-techniques" },
      { name: "Imaging and Radiotherapy Techniques", slug: "imaging-and-radiotherapy-techniques" }
    ],
    fee: "Özel Ücret",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
    description: `Roma'da sadece sağlık bilimlerine odaklanan, uluslararası öğrencileri hedefleyen özel tıp üniversitesi.`,
    description_en: `Private medical university in Rome focused solely on health sciences for international students.`,
    website: "https://www.unicamillus.org",
    features: ["Sadece Sağlık", "Uluslararası", "Roma"],
    features_en: ["Health Only", "International", "Rome"]
  },
  {
    id: 42,
    name: "Link Campus University",
    city: "Roma",
    type: "Özel",
    departments: [
      { name: "Business and Institutional Economics", slug: "business-and-institutional-economics" },
      { name: "Communication Sciences & Digital Technologies", slug: "communication-sciences-and-digital-technologies" },
      { name: "Political Science & Diplomacy", slug: "political-science-and-diplomacy" },
      { name: "Business and Institutional Economics and Management", slug: "business-and-institutional-economics-and-management" },
      { name: "Communication Sciences, Media and Digital Technologies", slug: "communication-sciences-media-and-digital-technologies" },
      { name: "Political Science, Diplomacy and Government of Administrations", slug: "political-science-diplomacy-and-government-of-administrations" }
    ],
    fee: "Özel Ücret",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
    description: `Roma'da spor ve diplomasi alanlarında güçlü, modern eğitim tekniklerini kullanan özel üniversite.`,
    description_en: `Private university in Rome using modern techniques, strong in sports and diplomacy.`,
    website: "https://www.unilink.it",
    features: ["Diplomasi", "Dijital Medya", "Spor"],
    features_en: ["Diplomacy", "Digital Media", "Sports"]
  },
  {
    id: 43,
    name: "European University of Rome",
    city: "Roma",
    type: "Özel",
    departments: [
      { name: "Economics and Business Management", slug: "economics-and-business-management" },
      { name: "Tourism and Local Development", slug: "tourism-and-local-development" }
    ],
    fee: "Özel Ücret",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
    description: `Roma'da butik eğitim veren, öğrencileriyle birebir ilgilenen özel bir kampüs üniversitesi.`,
    description_en: `A private campus university in Rome offering boutique education and personal attention.`,
    website: "https://www.unier.it",
    features: ["Butik Eğitim", "Kariyer Odaklı", "Roma"],
    features_en: ["Boutique Edu", "Career Focused", "Rome"]
  },
  {
    id: 44,
    name: "IULM University",
    city: "Milano",
    type: "Özel",
    departments: [
      { name: "Corporate Communication and Public Relations", slug: "corporate-communication-and-public-relations" }
    ],
    fee: "Özel Ücret",
    image: "https://images.unsplash.com/photo-1610016302534-6f67f1c968d8?q=80&w=1975&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    description: `Milano'da iletişim, medya ve halkla ilişkiler alanında lider özel üniversite.`,
    description_en: `Leading private university in Milan for communication, media, and public relations.`,
    website: "https://www.iulm.it",
    features: ["İletişim Lideri", "Medya", "Milano"],
    features_en: ["Comm. Leader", "Media", "Milan"]
  },
  {
    id: 45,
    name: "University of Gastronomic Sciences",
    city: "Pollenzo",
    type: "Özel",
    departments: [
      { name: "Gastronomic Sciences and Cultures", slug: "gastronomic-sciences-and-cultures" }
    ],
    fee: "Özel Ücret",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Slow Food hareketi tarafından kurulan, dünyanın ilk gastronomi üniversitesi.`,
    description_en: `The world's first gastronomy university, founded by the Slow Food movement.`,
    website: "https://www.unisg.it",
    features: ["Gastronomi", "Gıda Kültürü", "Butik"],
    features_en: ["Gastronomy", "Food Culture", "Boutique"]
  },
  {
    id: 46,
    name: "Politecnico di Bari",
    city: "Bari",
    type: "Devlet",
    departments: [
      { name: "Architecture Sciences for Heritage", slug: "architecture-sciences-for-heritage" },
      { name: "Management Engineering for Innovation", slug: "management-engineering-for-innovation" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Tarihi mirasın korunması ve mimari bilimlerin teknik analizi üzerine odaklanan uzmanlık.`,
    description_en: `A specialization focused on preservation of historical heritage and technical analysis of architectural sciences.`,
    website: "https://google.com/search?q=Politecnico+di+Bari+Architecture+Sciences",
    features: ["İngilizce Eğitim", "Teknik Uzmanlık", "Akdeniz Kültürü"],
    features_en: ["English Education","Technical Expertise","Mediterranean Culture"]
  },
  {
    id: 47,
    name: "Università Campus Bio-Medico di Roma",
    city: "Roma",
    type: "Devlet",
    departments: [
      { name: "Biomedical Engineering", slug: "biomedical-engineering" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Roma'da mühendislik ve tıp dünyasını birleştiren, teknoloji odaklı biyomedikal eğitimi.`,
    description_en: `Technology-focused biomedical education bridging engineering and medicine in Rome.`,
    website: "https://google.com/search?q=Università+Campus+Bio-Medico+di+Roma+Biomedical+Engineering",
    features: ["İngilizce Eğitim", "İleri Teknoloji", "Tıbbi Mühendislik"],
    features_en: ["English Education","Advanced Technology","Medical Engineering"]
  },
  {
    id: 48,
    name: "Università degli Studi di Teramo",
    city: "Teramo",
    type: "Devlet",
    departments: [
      { name: "Biotechnology", slug: "biotechnology" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Biyoteknoloji dünyasına giriş yapmak isteyenler için kapsamlı ve bilimsel bir temel.`,
    description_en: `A comprehensive, scientific foundation for those looking to enter the world of biotechnology.`,
    website: "https://google.com/search?q=Università+degli+Studi+di+Teramo+Biotechnology",
    features: ["İngilizce Eğitim", "Temel Bilimler", "Merkezi Konum"],
    features_en: ["English Education","Fundamental Sciences","Central Location"]
  },
  {
    id: 49,
    name: "Università degli Studi del Piemonte Orientale",
    city: "Piemonte",
    type: "Devlet",
    departments: [
      { name: "Biotechnology", slug: "biotechnology" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Kuzey İtalya'nın dinamik ortamında modern biyoteknolojik yöntemler üzerine uzmanlık.`,
    description_en: `Expertise in modern biotechnological methods in the dynamic environment of Northern Italy.`,
    website: "https://google.com/search?q=Università+degli+Studi+del+Piemonte+Orientale+Biotechnology",
    features: ["İngilizce Eğitim", "Modern Laboratuvar", "3 Yıllık"],
    features_en: ["English Education","Modern Lab","3 Years"]
  },
  {
    id: 50,
    name: "Università Telematica Internazionale UNINETTUNO",
    city: "Uzaktan Eğitim / Roma",
    type: "Özel",
    departments: [
      { name: "Psycho-Social Disciplines", slug: "psycho-social-disciplines" },
      { name: "Economics and Business Administration", slug: "economics-and-business-administration" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Psikososyal disiplinler üzerine uzmanlaşma imkanı sunan, esnek yapılı uluslararası uzaktan eğitim programı.`,
    description_en: `A flexible international distance education program offering specialization in psycho-social disciplines.`,
    website: "https://google.com/search?q=UNINETTUNO+Psycho-Social+Disciplines",
    features: ["İngilizce Eğitim", "Online Eğitim", "Esnek Müfredat"],
    features_en: ["English Education","Online Education","Flexible Curriculum"]
  },
  {
    id: 51,
    name: "Università degli Studi di Bari Aldo Moro",
    city: "Bari",
    type: "Devlet",
    departments: [
      { name: "Earth System and Global Changes", slug: "earth-system-and-global-changes" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Küresel değişimleri ve dünya sistemini jeolojik perspektiften inceleyen kapsamlı lisans programı.`,
    description_en: `A comprehensive bachelor's program examining global changes and earth systems from a geological perspective.`,
    website: "https://google.com/search?q=Università+di+Bari+Earth+System+Global+Changes",
    features: ["İngilizce Eğitim", "Jeoloji", "3 Yıllık"],
    features_en: ["English Education","Geology","3 Years"]
  },
  {
    id: 52,
    name: "Università degli Studi Guglielmo Marconi - Telematica",
    city: "Roma",
    type: "Özel",
    departments: [
      { name: "Business Economics and Management", slug: "business-economics-and-management" },
      { name: "Computer Engineering", slug: "computer-engineering" },
      { name: "Psychological Science and Techniques", slug: "psychological-science-and-techniques" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Uzaktan eğitim modeliyle esnek, küresel standartlarda işletme ve ekonomi yönetimi eğitimi.`,
    description_en: `Flexible business economics and management education at global standards through distance learning.`,
    website: "https://google.com/search?q=Università+Guglielmo+Marconi+Business+Economics+and+Management",
    features: ["İngilizce Eğitim", "Online Eğitim", "3 Yıllık"],
    features_en: ["English Education","Online Education","3 Years"]
  },
  {
    id: 53,
    name: "Università degli Studi di Cagliari",
    city: "Cagliari",
    type: "Devlet",
    departments: [
      { name: "Business and Economics", slug: "business-and-economics" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Sardinya'nın merkezinde, ekonomi ve işletme dünyasının temellerine global bir bakış.`,
    description_en: `A global perspective on the fundamentals of economics and business in the center of Sardinia.`,
    website: "https://google.com/search?q=Università+di+Cagliari+Business+and+Economics",
    features: ["İngilizce Eğitim", "Stratejik Konum", "3 Yıllık"],
    features_en: ["English Education","Strategic Location","3 Years"]
  },
  {
    id: 54,
    name: "Università Carlo Cattaneo - LIUC",
    city: "Castellanza",
    type: "Özel",
    departments: [
      { name: "Economics and Management", slug: "economics-and-management" },
      { name: "Industrial Engineering", slug: "industrial-engineering" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Sanayi dünyasıyla doğrudan bağları olan, işletme ve ekonomi odaklı profesyonel bir eğitim.`,
    description_en: `Professional education focused on business and economics with direct ties to the industrial world.`,
    website: "https://google.com/search?q=LIUC+Carlo+Cattaneo+Economics+and+Management",
    features: ["İngilizce Eğitim", "İş Dünyası Odaklı", "Uygulamalı Eğitim"],
    features_en: ["English Education","Industry Focused","Applied Education"]
  },
  {
    id: 55,
    name: "LUM Giuseppe Degennaro",
    city: "Casamassima",
    type: "Özel",
    departments: [
      { name: "Business Economics and Organization", slug: "business-economics-and-organization" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Organizasyonel yapılar ve işletme ekonomisi üzerine yoğunlaşan, kariyer odaklı bir lisans programı.`,
    description_en: `A career-oriented bachelor's program focused on organizational structures and business economics.`,
    website: "https://google.com/search?q=LUM+University+Business+Economics+and+Organization",
    features: ["İngilizce Eğitim", "Organizasyonel Gelişim", "3 Yıllık"],
    features_en: ["English Education","Organizational Dev.","3 Years"]
  },
  {
    id: 56,
    name: "Università degli Studi G. d'Annunzio CHIETI-PESCARA",
    city: "Pescara",
    type: "Devlet",
    departments: [
      { name: "Economics and Finance", slug: "economics-and-finance" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Adriyatik kıyısında, finansal piyasalar ve ekonomi yönetimi üzerine sağlam bir temel.`,
    description_en: `A solid foundation in financial markets and economic management on the Adriatic coast.`,
    website: "https://google.com/search?q=Università+Pescara+Economics+and+Finance",
    features: ["İngilizce Eğitim", "Finans Odağı", "3 Yıllık"],
    features_en: ["English Education","Finance Focus","3 Years"]
  },
  {
    id: 57,
    name: "Università degli Studi di CATANIA",
    city: "Catania",
    type: "Devlet",
    departments: [
      { name: "Physics", slug: "physics" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Teorik ve uygulamalı fizik alanında, Sicilya'nın en güçlü araştırma merkezlerinden birinde eğitim.`,
    description_en: `Education in theoretical and applied physics at one of Sicily's strongest research centers.`,
    website: "https://google.com/search?q=Università+di+Catania+Physics+Bachelor+English",
    features: ["İngilizce Eğitim", "Temel Bilimler", "Araştırma Odaklı"],
    features_en: ["English Education","Fundamental Sciences","Research Focused"]
  },
  {
    id: 58,
    name: "Università degli Studi di FERRARA",
    city: "Ferrara",
    type: "Devlet",
    departments: [
      { name: "Physiotherapy", slug: "physiotherapy" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Hareket biliminde uzmanlaşmak isteyenler için modern tekniklerle donatılmış fizyoterapi eğitimi.`,
    description_en: `Physiotherapy education equipped with modern techniques for those aspiring to specialize in movement science.`,
    website: "https://google.com/search?q=Università+di+Ferrara+Physiotherapy+English",
    features: ["İngilizce Eğitim", "Klinik Uygulama", "3 Yıllık"],
    features_en: ["English Education","Clinical Practice","3 Years"]
  },
  {
    id: 59,
    name: "Università degli Studi Mediterranea di REGGIO CALABRIA",
    city: "Reggio Calabria",
    type: "Devlet",
    departments: [
      { name: "Civil and Environmental Engineering for Sustainable Development", slug: "civil-and-environmental-engineering-for-sustainable-development" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Sürdürülebilir kalkınma odaklı inşaat ve çevre mühendisliği çözümleri üzerine uzmanlaşmış bir program.`,
    description_en: `A program specialized in civil and environmental engineering solutions focused on sustainable development.`,
    website: "https://google.com/search?q=Università+Mediterranea+Civil+Environmental+Engineering",
    features: ["İngilizce Eğitim", "Sürdürülebilirlik", "3 Yıllık"],
    features_en: ["English Education","Sustainability","3 Years"]
  },
  {
    id: 60,
    name: "Università della VALLE D'AOSTA",
    city: "Aosta",
    type: "Devlet",
    departments: [
      { name: "Language and Communication for Business and Tourism", slug: "language-and-communication-for-business-and-tourism" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `İş dünyası ve turizm sektörü için profesyonel dil ve iletişim becerileri kazandıran çok dilli program.`,
    description_en: `A multilingual program building professional language and communication skills for business and tourism.`,
    website: "https://google.com/search?q=Università+Valle+Aosta+Language+Business+Tourism",
    features: ["İngilizce Eğitim", "Turizm İletişimi", "3 Yıllık"],
    features_en: ["English Education","Tourism Comm.","3 Years"]
  },
  {
    id: 62,
    name: "Università Telematica Giustino Fortunato",
    city: "Benevento / Online",
    type: "Özel",
    departments: [
      { name: "Science and Technology of Transportation", slug: "science-and-technology-of-transportation" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Ulaşım sistemleri teknolojisi ve yönetimi üzerine uzaktan eğitim esnekliğiyle uzmanlaşın.`,
    description_en: `Specialize in transportation systems technology and management with the flexibility of distance learning.`,
    website: "https://google.com/search?q=Università+Giustino+Fortunato+Transportation+Science",
    features: ["İngilizce Eğitim", "Online Eğitim", "Lojistik Odaklı"],
    features_en: ["English Education","Online Education","Logistics Focused"]
  },
  {
    id: 63,
    name: "Università degli Studi di Firenze",
    city: "Floransa",
    type: "Devlet",
    departments: [
      { name: "Sustainable Business for Societal Challenges", slug: "sustainable-business-for-societal-challenges" }
    ],
    fee: "150€ - 3.000€",
    image: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80",
    description: `Toplumsal sorunlara sürdürülebilir iş modelleriyle çözümler üreten modern işletme yönetimi eğitimi.`,
    description_en: `Modern business management education producing sustainable business model solutions for societal challenges.`,
    website: "https://google.com/search?q=Università+di+Firenze+Sustainable+Business",
    features: ["İngilizce Eğitim", "İnovasyon", "3 Yıllık"],
    features_en: ["English Education","Innovation","3 Years"]
  }

];