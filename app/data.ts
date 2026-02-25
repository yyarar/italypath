// src/app/data.ts

export interface University {
  id: number;
  name: string;
  city: string;
  type: string;
  departments: string[];
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
      "Architectural Design",
      "Civil Engineering",
      "Interaction Design",
      "Mechanical Engineering",
      "Industrial and Production Engineering"
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
      "Applied Computer Science & AI (ACSAI)",
      "Bioinformatics",
      "Classics",
      "Global Humanities",
      "Sustainable Building Engineering",
      "Nursing",
      "Economics and Finance",
      "Business Sciences",
      "Environmental Engineering",
      "Applied Computer Science and Artificial Intelligence",
      "Environmental Engineering for Sustainable Development",
      "Oriental Languages and Civilizations",
      "Molecular Biology, Medicinal Chemistry and Computer Science for Pharmaceutical Applications"
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
      "Business and Economics (CLABE)",
      "Economics and Finance (CLEF)",
      "International Relations",
      "Genomics",
      "Economics of Tourism",
      "International Studies",
      "Statistical Sciences",
      "Building Construction Engineering",
      "Business and Economics",
      "Business Economics",
      "Economics and Finance",
      "Economics of Tourism and Cities",
      "Economics, Politics and Social Sciences",
      "European Studies",
      "Management and Economics"
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
      "Psychological Science",
      "Animal Care",
      "Information Engineering",
      "Italian Medieval Renaissance",
      "Biology of Human and Environmental Health",
      "Earth and Climate Dynamics",
      "Health Assistance",
      "Automation and System Engineering",
      "Internet, Multimedia and Telecommunications Engineering",
      "Italian Medieval and Renaissance Studies",
      "Techniques and Methods in Psychological Science"
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
      "Automotive Engineering",
      "Computer Engineering",
      "Electronic and Communications Engineering",
      "Mechanical Engineering",
      "Architecture",
      "Civil and Environmental Engineering"
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
      "Sustainable Agriculture and Forestry",
      "Design and Art",
      "Economics and Management",
      "Computer Science",
      "Wood Technology",
      "Food and Enogastronomy Sciences",
      "Sustainable Agriculture and Forestry in Mountain Environments",
      "Economics, Politics and Ethics",
      "Informatics and Management of Digital Business",
      "Electronic and Information Engineering",
      "Industrial and Mechanical Engineering",
      "Tourism, Sport and Event Management",
      "Social Education",
      "Communication Sciences and Culture",
      "Social Work"
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
      "International Economics and Management",
      "International Economics and Finance",
      "Economic and Social Sciences",
      "Economics, Management and Computer Science",
      "Mathematical and Computing Sciences for AI",
      "World Bachelor in Business",
      "Business (World Bachelor in Business)",
      "Economics and Management for Arts, Culture and Communication",
      "Global Law",
      "International Politics and Government",
      "Mathematical and Computing Sciences for Artificial Intelligence"
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
      "Economics and Management",
      "International Relations and Global Affairs",
      "Psychology",
      "Food Production Management",
      "Medicine (Roma)",
      "Communication and Society",
      "Business and Finance",
      "Business Administration",
      "Food Science and Technology",
      "Political Sciences and International Relations",
      "Sociology"
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
      "Digital Management",
      "Economics and Business",
      "Philosophy, International and Economic Studies",
      "Hospitality Innovation and E-Tourism",
      "Computer Science",
      "Business Administration and Management",
      "Languages, Cultures and Societies of Asia and Mediterranean Africa"
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
      "International Politics, Law and Economics (IPLE)",
      "Artificial Intelligence",
      "Political Sciences",
      "Economics: Behavior, Data and Policy",
      "Medical Biotechnology",
      "Ancient Civilizations for the Contemporary World"
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
      "Global Law and Transnational Legal Studies",
      "Business & Management",
      "Biotechnology",
      "Economics",
      "Economics and Finance with Data Science",
      "Mathematics for Economics, Finance and Insurance"
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
      "Management & Computer Science",
      "Politics: Philosophy and Economics (PPE)",
      "Business Administration",
      "Global Law",
      "Management and AI",
      "Economics and Business",
      "Management and Artificial Intelligence",
      "Politics: Philosophy and Economics"
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
      "Global Governance",
      "Engineering Sciences",
      "Business Administration & Economics",
      "Tourism Sciences"
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
      "Biology for One-Health",
      "Civil and Environmental Engineering",
      "Hospitality Management",
      "Precision Livestock Farming",
      "Community Design"
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
      "Artificial Intelligence",
      "Medicine (6 Yıl)",
      "Bioengineering",
      "Social Sciences for Global Challenges"
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
      "Economics and Banking",
      "Economics and Management",
      "Dentistry (Diş Hekimliği)",
      "Biotech Engineering for Health"
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
      "Data Analysis",
      "Political Sciences",
      "Medicine (6 Yıl)",
      "Civil Engineering",
      "Marine Biology",
      "Computer Science",
      "Biotechnology",
      "Economics, Banking and Finance",
      "Business Management",
      "Marine Biology and Blue Biotechnologies",
      "Political Sciences and International Relations",
      "Transnational and European Legal Studies"
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
      "Computer Science",
      "Comparative Legal Studies",
      "Biomolecular Sciences",
      "Computer & Electronic Engineering",
      "Computer, Communications and Electronic Engineering",
      "Biomolecular Sciences and Technology",
      "Comparative, European and International Legal Studies"
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
      "Humanities (IPM)",
      "Management for Business and Economics",
      "Geology",
      "Cultural Heritage Studies",
      "Studies in Performing Arts and Communication",
      "Historical Studies"
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
      "Maritime Science and Technology",
      "Computer Engineering",
      "Engineering Technology for Strategy",
      "Computer Engineering (Sede Imperia)"
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
      "Earth Sciences",
      "Business Administration",
      "International Economics",
      "Industrial Engineering",
      "Earth Sciences for Sustainable Development",
      "Business Administration and Management",
      "International Economics and Financial Markets"
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
      "Dietistic",
      "Digital Economics",
      "Dental Hygiene",
      "Environmental Sciences",
      "Imaging and Radiotherapy",
      "Midwifery",
      "Digital Economics and Business",
      "Environmental Sciences and Civil Protection",
      "Imaging and Radiotherapy Techniques"
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
      "Dental Hygiene",
      "Global Studies for Sustainable Development",
      "Global Studies for Sustainable Local and International Development and Cooperation"
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
      "Nursing",
      "Data Analytics",
      "Medicine (6 Yıl)"
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
      "Economics and Finance",
      "Economics & International Cooperation",
      "Electronics Engineering",
      "Management Engineering",
      "Nursing",
      "Economics, International Cooperation and Sustainable Development"
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
      "Business Administration"
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
      "Business and Economics"
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
      "Computer Engineering for Robotic and Intelligent Systems"
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
      "Economics and Science for Environmental Sustainability",
      "Physical Sciences for Innovative Technologies"
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
      "Biosciences and Biotechnology",
      "Gastronomic Sciences"
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
      "Economics and Business",
      "Global Economy",
      "Industrial Engineering",
      "Economics with Data Science",
      "Industrial Engineering Technology"
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
      "Design",
      "Agricultural Sciences",
      "Food and Wine Technologies",
      "Forestry",
      "Forestry and Environmental Sciences",
      "Agricultural and Environmental Sciences"
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
      "Engineering Management",
      "Optics and Optometry",
      "Programming and Management of Computer Systems"
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
      "Social Sciences for Sustainability",
      "Social Sciences for Sustainability and International Cooperation"
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
      "Business Administration",
      "International Business",
      "Tourist Firm Management",
      "Sustainable Blue Economy",
      "International Business Administration and Management"
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
      "Digital Management"
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
      "Management & Business Analytics"
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
      "International, European and Comparative Legal Studies",
      "International, European and Comparative Legal Studies (IECOLS)"
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
      "Economics and Management"
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
      "Computer Engineering"
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
      "Medicine",
      "Physiotherapy",
      "Nursing",
      "Midwifery",
      "Biomedical Lab Techniques",
      "Radiotherapy Techniques",
      "Biomedical Laboratory Techniques",
      "Imaging and Radiotherapy Techniques"
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
      "Business and Institutional Economics",
      "Communication Sciences & Digital Technologies",
      "Political Science & Diplomacy",
      "Business and Institutional Economics and Management",
      "Communication Sciences, Media and Digital Technologies",
      "Political Science, Diplomacy and Government of Administrations"
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
      "Economics and Business Management",
      "Tourism and Local Development"
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
      "Corporate Communication and Public Relations"
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
      "Gastronomic Sciences and Cultures"
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
      "Architecture Sciences for Heritage",
      "Management Engineering for Innovation"
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
      "Biomedical Engineering"
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
      "Biotechnology"
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
      "Biotechnology"
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
      "Psycho-Social Disciplines",
      "Economics and Business Administration"
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
      "Earth System and Global Changes"
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
      "Business Economics and Management",
      "Computer Engineering",
      "Psychological Science and Techniques"
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
      "Business and Economics"
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
      "Economics and Management",
      "Industrial Engineering"
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
      "Business Economics and Organization"
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
      "Economics and Finance"
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
      "Physics"
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
      "Physiotherapy"
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
      "Civil and Environmental Engineering for Sustainable Development"
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
      "Language and Communication for Business and Tourism"
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
      "Science and Technology of Transportation"
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
      "Sustainable Business for Societal Challenges"
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