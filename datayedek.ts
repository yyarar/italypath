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
  website: string;
  features: string[];
}

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
    image: "from-blue-600 to-indigo-700",
    description: `İtalya'nın bir numaralı teknik üniversitesi. Mühendislik, mimarlık ve tasarım alanlarında dünya lideridir. Piacenza ve Mantova kampüslerinde de eğitim verir.`,
    website: "https://www.polimi.it",
    features: ["QS #1 İtalya", "Teknik Eğitim", "Yüksek İş İmkanı"]
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
      "Environmental Engineering"
    ],
    fee: "150€ - 2.924€",
    image: "from-red-700 to-orange-800",
    description: `Roma'nın kalbinde, Avrupa'nın en büyük üniversitesi. 700 yıllık tarihiyle antik çağdan yapay zekaya kadar her alanda eğitim verir.`,
    website: "https://www.uniroma1.it",
    features: ["700 Yıllık Tarih", "Başkent", "Geniş Bölüm Yelpazesi"]
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
      "Statistical Sciences"
    ],
    fee: "150€ - 2.500€",
    image: "from-red-600 to-rose-700",
    description: `Dünyanın en eski üniversitesi (1088). Tam bir öğrenci şehri ve akademik mükemmeliyet merkezi.`,
    website: "https://www.unibo.it",
    features: ["Dünyanın En Eskisi", "Öğrenci Şehri", "Sosyal Bilimler"]
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
      "Earth and Climate Dynamics"
    ],
    fee: "150€ - 2.600€",
    image: "from-red-800 to-red-900",
    description: `Galileo Galilei'nin ders verdiği, İtalya'nın en eski ikinci üniversitesi. Psikolojide liderdir.`,
    website: "https://www.unipd.it",
    features: ["Psikolojide Lider", "Venedik'e Yakın", "Köklü Tarih"]
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
      "Architecture"
    ],
    fee: "150€ - 2.600€",
    image: "from-orange-500 to-amber-600",
    description: `İtalya'nın otomotiv başkenti Torino'da yer alır. Mühendislik ve mimarlıkta Avrupa devidir.`,
    website: "https://www.polito.it",
    features: ["Otomotivin Kalbi", "Teknokent Kampüsü", "Endüstri Bağlantıları"]
  },
  {
    id: 6,
    name: "Free University of Bozen-Bolzano",
    "city": "Bolzano",
    "type": "Devlet",
    "departments": [
      "Sustainable Agriculture and Forestry",
      "Design and Art",
      "Economics and Management",
      "Computer Science",
      "Wood Technology",
      "Food and Enogastronomy Sciences"
    ],
    fee: "150€ - 1.350€",
    image: "from-emerald-500 to-green-700",
    description: `Alplerin kalbinde, üç dilli (İtalyanca, Almanca, İngilizce) eğitim veren zengin ve butik üniversite.`,
    website: "https://www.unibz.it",
    features: ["Üç Dilli Eğitim", "Yüksek İstihdam", "Modern Tesisler"]
  },
  {
    id: 7,
    name: "Bocconi University",
    "city": "Milano",
    "type": "Özel",
    "departments": [
      "International Economics and Management",
      "International Economics and Finance",
      "Economic and Social Sciences",
      "Economics, Management and Computer Science",
      "Mathematical and Computing Sciences for AI",
      "World Bachelor in Business"
    ],
    fee: "14.000€ - 16.500€",
    image: "from-indigo-900 to-slate-900",
    description: `Avrupa'nın en prestijli ekonomi okulu. Mezunları doğrudan küresel finans merkezlerinde iş bulur.`,
    website: "https://www.unibocconi.eu",
    features: ["Elit Ekonomi", "Güçlü Network", "Prestij"]
  },
  {
    id: 8,
    name: "Università Cattolica del Sacro Cuore",
    "city": "Milano",
    "type": "Özel",
    "departments": [
      "Economics and Management",
      "International Relations and Global Affairs",
      "Psychology",
      "Food Production Management",
      "Medicine (Roma)",
      "Communication and Society"
    ],
    fee: "3.000€ - 9.000€",
    image: "from-blue-800 to-indigo-900",
    description: `Avrupa'nın en büyük özel üniversitesi. Farklı şehirlerde kampüsleri ve güçlü endüstri bağları vardır.`,
    website: "https://www.unicatt.eu",
    features: ["Çok Kampüslü", "Özel İlgi", "Geniş Ağ"]
  },
  {
    id: 9,
    name: "Ca' Foscari University of Venice",
    "city": "Venedik",
    "type": "Devlet",
    "departments": [
      "Digital Management",
      "Economics and Business",
      "Philosophy, International and Economic Studies",
      "Hospitality Innovation and E-Tourism",
      "Computer Science"
    ],
    fee: "150€ - 2.300€",
    image: "from-cyan-600 to-blue-500",
    description: `Venedik kanalları üzerinde eğitim. Ekonomi, diller ve dijital yönetim alanlarında uzmanlaşmıştır.`,
    website: "https://www.unive.it",
    features: ["Venedik Kampüsü", "Dil ve Kültür", "H-FARM (Digital)"]
  },
  {
    id: 10,
    name: "University of Milan (Statale)",
    "city": "Milano",
    "type": "Devlet",
    "departments": [
      "International Politics, Law and Economics (IPLE)",
      "Artificial Intelligence",
      "Political Sciences",
      "Economics: Behavior, Data and Policy",
      "Medical Biotechnology"
    ],
    fee: "150€ - 4.000€",
    image: "from-green-600 to-teal-700",
    description: `Milano'nun merkezindeki dev devlet üniversitesi. Siyaset bilimi ve hukuk alanında çok güçlüdür.`,
    website: "https://www.unimi.it",
    features: ["Merkezi Konum", "Siyaset Bilimi", "Araştırma"]
  },
  {
    id: 11,
    name: "University of Turin",
    "city": "Torino",
    "type": "Devlet",
    "departments": [
      "Global Law and Transnational Legal Studies",
      "Business & Management",
      "Biotechnology",
      "Economics"
    ],
    fee: "150€ - 2.800€",
    image: "from-teal-600 to-emerald-700",
    description: `Torino'nun köklü üniversitesi. Hukuk (Global Law) ve işletme alanında İngilizce programları popülerdir.`,
    website: "https://www.unito.it",
    features: ["Hukukta Öncü", "Kraliyet Mimarisi", "Geniş Kampüs"]
  },
  {
    id: 12,
    name: "Luiss Guido Carli",
    "city": "Roma",
    "type": "Özel",
    "departments": [
      "Management & Computer Science",
      "Politics: Philosophy and Economics (PPE)",
      "Business Administration",
      "Global Law",
      "Management and AI"
    ],
    fee: "11.000€ - 12.000€",
    image: "from-blue-900 to-slate-800",
    description: `İtalyan Sanayiciler Birliği tarafından kurulan, iş dünyası ve siyasetle iç içe elit bir üniversite.`,
    website: "https://www.luiss.edu",
    features: ["İş Dünyası Ağı", "Lüks Kampüs", "Siyaset Bilimi"]
  },
  {
    id: 13,
    name: "University of Rome Tor Vergata",
    "city": "Roma",
    "type": "Devlet",
    "departments": [
      "Global Governance",
      "Engineering Sciences",
      "Business Administration & Economics",
      "Tourism Sciences"
    ],
    fee: "150€ - 2.500€",
    image: "from-emerald-500 to-green-700",
    description: `Roma'nın modern kampüs üniversitesi. Global Governance bölümü disiplinlerarası yapısıyla ünlüdür.`,
    website: "https://web.uniroma2.it",
    features: ["Global Governance", "Modern Kampüs", "Disiplinlerarası"]
  },
  {
    id: 14,
    name: "University of Naples Federico II",
    "city": "Napoli",
    "type": "Devlet",
    "departments": [
      "Biology for One-Health",
      "Civil and Environmental Engineering",
      "Hospitality Management",
      "Precision Livestock Farming"
    ],
    fee: "150€ - 2.500€",
    image: "from-sky-600 to-blue-700",
    description: `Dünyanın en eski devlet üniversitesi (1224). Napoli'nin canlı kültürü ve Apple Academy ile ünlüdür.`,
    website: "https://www.unina.it",
    features: ["Apple Academy", "Tarihi Şehir", "Ekonomik Yaşam"]
  },
  {
    id: 15,
    name: "University of Pavia",
    "city": "Pavia",
    "type": "Devlet",
    "departments": [
      "Artificial Intelligence",
      "Medicine (6 Yıl)",
      "Bioengineering",
      "Social Sciences for Global Challenges"
    ],
    fee: "150€ - 4.500€",
    image: "from-yellow-600 to-orange-600",
    description: `Milano'ya yakın, kolej (yurt) sistemiyle yönetilen, tıpta ve mühendislikte güçlü tarihi okul.`,
    website: "https://web.unipv.it",
    features: ["Kolej Sistemi", "Yapay Zeka", "Tıpta Güçlü"]
  },
  {
    id: 16,
    name: "University of Siena",
    "city": "Siena",
    "type": "Devlet",
    "departments": [
      "Economics and Banking",
      "Economics and Management",
      "Dentistry (Diş Hekimliği)",
      "Biotech Engineering for Health"
    ],
    fee: "150€ - 2.200€",
    image: "from-orange-700 to-red-600",
    description: `Bankacılık tarihinin başladığı şehir. Orta çağ atmosferinde güvenli bir eğitim ortamı sunar.`,
    website: "https://en.unisi.it",
    features: ["Orta Çağ Atmosferi", "Güvenli Şehir", "Finans"]
  },
  {
    id: 17,
    name: "University of Messina",
    "city": "Messina",
    "type": "Devlet",
    "departments": [
      "Data Analysis",
      "Political Sciences",
      "Medicine (6 Yıl)",
      "Civil Engineering",
      "Marine Biology",
      "Computer Science"
    ],
    fee: "150€ - 750€",
    image: "from-blue-400 to-cyan-500",
    description: `Sicilya'nın boğaz manzaralı şehri. Uygun fiyatlı yaşam ve geniş İngilizce bölüm seçenekleri.`,
    website: "https://international.unime.it",
    features: ["Deniz Manzarası", "Ekonomik", "Veri Analizi"]
  },
  {
    id: 18,
    name: "University of Trento",
    "city": "Trento",
    "type": "Devlet",
    "departments": [
      "Computer Science",
      "Comparative Legal Studies",
      "Biomolecular Sciences",
      "Computer & Electronic Engineering"
    ],
    fee: "150€ - 2.000€",
    image: "from-indigo-500 to-purple-600",
    description: `İtalya'nın yaşam kalitesi en yüksek şehrinde, özellikle bilgisayar ve hukuk alanında üst düzey eğitim.`,
    website: "https://www.unitn.it",
    features: ["Yüksek Yaşam Kalitesi", "Doğa", "Bilişim Lideri"]
  },
  {
    id: 19,
    name: "University of Pisa",
    "city": "Pisa",
    "type": "Devlet",
    "departments": [
      "Humanities (IPM)",
      "Management for Business and Economics",
      "Geology",
      "Cultural Heritage Studies"
    ],
    fee: "150€ - 2.400€",
    image: "from-yellow-500 to-amber-600",
    description: `Galileo'nun şehri. Humanities bölümü sözelciler için eşsizdir. Tarihi dokusu büyüleyicidir.`,
    website: "https://www.unipi.it",
    features: ["Humanities", "Tarihi Şehir", "Akademik Gelenek"]
  },
  {
    id: 20,
    name: "University of Genoa",
    "city": "Cenova",
    "type": "Devlet",
    "departments": [
      "Maritime Science and Technology",
      "Computer Engineering",
      "Engineering Technology for Strategy"
    ],
    fee: "0€ - 3.000€",
    image: "from-blue-500 to-teal-500",
    description: `İtalya'nın en büyük liman kenti. Denizcilik, gemi mühendisliği ve robotik alanında rakipsizdir.`,
    website: "https://unige.it",
    features: ["Denizcilik Lideri", "Liman Kenti", "Mühendislik"]
  },
  {
    id: 21,
    name: "University of Trieste",
    "city": "Trieste",
    "type": "Devlet",
    "departments": [
      "Earth Sciences",
      "Business Administration",
      "International Economics",
      "Industrial Engineering"
    ],
    fee: "150€ - 3.000€",
    image: "from-red-700 to-orange-800",
    description: `İtalya'nın doğu kapısı Trieste'de, uluslararası ticaret, fizik ve mühendislik alanlarında güçlüdür.`,
    website: "https://www.units.it",
    features: ["Liman Kenti", "Fizik ve Ekonomi", "Sınır Şehri"]
  },
  {
    id: 22,
    name: "Marche Polytechnic University",
    "city": "Ancona",
    "type": "Devlet",
    "departments": [
      "Dietistic",
      "Digital Economics",
      "Dental Hygiene",
      "Environmental Sciences",
      "Imaging and Radiotherapy",
      "Midwifery"
    ],
    fee: "150€ - 3.000€",
    image: "from-emerald-500 to-green-700",
    description: `Adriyatik kıyısında, özellikle sağlık bilimleri ve mühendislik alanında teknik eğitim verir.`,
    website: "https://www.univpm.it",
    features: ["Sağlık Bilimleri", "Teknik Eğitim", "Deniz Kenarı"]
  },
  {
    id: 23,
    name: "University of Parma",
    "city": "Parma",
    "type": "Devlet",
    "departments": [
      "Dental Hygiene",
      "Global Studies for Sustainable Development"
    ],
    fee: "150€ - 3.000€",
    image: "from-yellow-500 to-amber-600",
    description: `Gıda vadisinin kalbinde, yaşam kalitesi yüksek Parma şehrinde köklü bir eğitim kurumu.`,
    website: "https://www.unipr.it",
    features: ["Gıda Vadisi", "Yaşam Kalitesi", "Sürdürülebilirlik"]
  },
  {
    id: 24,
    name: "Vanvitelli University",
    "city": "Napoli / Caserta",
    "type": "Devlet",
    "departments": [
      "Nursing",
      "Data Analytics",
      "Medicine (6 Yıl)"
    ],
    fee: "150€ - 2.000€",
    image: "from-sky-500 to-blue-600",
    description: `Güney İtalya'da, özellikle Hemşirelik ve Veri Analitiği gibi niş İngilizce bölümleriyle öne çıkar.`,
    website: "https://www.unicampania.it",
    features: ["Hemşirelik", "Güney İtalya", "Sıcak İklim"]
  },
  {
    id: 25,
    name: "University of Palermo",
    "city": "Palermo",
    "type": "Devlet",
    "departments": [
      "Economics and Finance",
      "Economics & International Cooperation",
      "Electronics Engineering",
      "Management Engineering",
      "Nursing"
    ],
    fee: "150€ - 3.000€",
    image: "from-red-700 to-orange-800",
    description: `Sicilya'nın başkentinde, Akdeniz kültürünün merkezinde geniş yelpazeli İngilizce eğitim.`,
    website: "https://www.unipa.it",
    features: ["Akdeniz Kültürü", "Ekonomi", "Mühendislik"]
  },
  {
    id: 26,
    name: "University of Bergamo",
    "city": "Bergamo",
    "type": "Devlet",
    "departments": [
      "Business Administration"
    ],
    fee: "150€ - 3.000€",
    image: "from-emerald-500 to-green-700",
    description: `Milano'ya yakın, tarihi ve sanayi açısından zengin bir şehirde işletme eğitimi.`,
    website: "https://www.unibg.it",
    features: ["Sanayi Şehri", "İşletme", "Tarihi Merkez"]
  },
  {
    id: 27,
    name: "University of Brescia",
    "city": "Brescia",
    "type": "Devlet",
    "departments": [
      "Business and Economics"
    ],
    fee: "150€ - 3.000€",
    image: "from-blue-600 to-indigo-700",
    description: `Lombardiya'nın önemli sanayi kentlerinden Brescia'da ekonomi ve iş dünyası odaklı eğitim.`,
    website: "https://www.unibs.it",
    features: ["Ekonomi", "Sanayi", "Kuzey İtalya"]
  },
  {
    id: 28,
    name: "University of Verona",
    "city": "Verona",
    "type": "Devlet",
    "departments": [
      "Computer Engineering for Robotic and Intelligent Systems"
    ],
    fee: "150€ - 3.000€",
    image: "from-red-700 to-orange-800",
    description: `Romeo ve Juliet'in şehrinde, robotik ve akıllı sistemler üzerine ileri teknoloji eğitimi.`,
    website: "https://www.univr.it",
    features: ["Robotik", "Akıllı Sistemler", "Tarihi Şehir"]
  },
  {
    id: 29,
    name: "University of Milano-Bicocca",
    "city": "Milano",
    "type": "Devlet",
    "departments": [
      "Economics and Science for Environmental Sustainability",
      "Physical Sciences for Innovative Technologies"
    ],
    fee: "150€ - 3.000€",
    image: "from-emerald-500 to-green-700",
    description: `Milano'nun modern kampüs üniversitesi. Sürdürülebilirlik ve teknolojik inovasyon odaklıdır.`,
    website: "https://www.unimib.it",
    features: ["Sürdürülebilirlik", "Gelecek Odaklı", "Modern Kampüs"]
  },
  {
    id: 30,
    name: "University of Camerino",
    "city": "Camerino",
    "type": "Devlet",
    "departments": [
      "Biosciences and Biotechnology",
      "Gastronomic Sciences"
    ],
    fee: "156€ flat tax",
    image: "from-pink-600 to-rose-600",
    description: `Tepenin üzerine kurulu masalsı bir şehir. Biyoteknoloji ve gastronomi alanında İngilizce eğitim verir.`,
    website: "https://www.unicam.it",
    features: ["Tarihi Tepe Şehri", "Biyobilimler", "Sakin Ortam"]
  },
  {
    id: 31,
    name: "University of Cassino",
    "city": "Cassino",
    "type": "Devlet",
    "departments": [
      "Economics and Business",
      "Global Economy",
      "Industrial Engineering",
      "Economics with Data Science"
    ],
    fee: "150€ - 1.800€",
    image: "from-purple-500 to-indigo-600",
    description: `Roma ve Napoli arasında, yaşam maliyeti uygun olan küçük bir öğrenci şehri.`,
    website: "https://www.unicas.it",
    features: ["Ekonomik Yaşam", "Roma'ya Yakın", "Butik Kampüs"]
  },
  {
    id: 32,
    name: "University of Tuscia",
    "city": "Viterbo",
    "type": "Devlet",
    "departments": [
      "Design",
      "Agricultural Sciences",
      "Food and Wine Technologies",
      "Forestry"
    ],
    fee: "150€ - 3.000€",
    image: "from-emerald-500 to-green-700",
    description: `Roma'ya yakın, doğa bilimleri ve tarım teknolojileri konusunda uzmanlaşmış butik bir üniversite.`,
    website: "https://www.unitus.it",
    features: ["Tarım ve Orman", "Doğa Dostu", "Butik Eğitim"]
  },
  {
    id: 33,
    name: "University of Perugia",
    "city": "Perugia",
    "type": "Devlet",
    "departments": [
      "Engineering Management",
      "Optics and Optometry",
      "Programming and Management of Computer Systems"
    ],
    fee: "150€ - 3.000€",
    image: "from-emerald-500 to-green-700",
    description: `İtalya'nın yeşil kalbi Umbria'da, tarihi ve canlı bir öğrenci şehri.`,
    website: "https://www.unipg.it",
    features: ["Öğrenci Şehri", "Mühendislik", "Tarihi Doku"]
  },
  {
    id: 34,
    name: "University for Foreigners of Perugia",
    "city": "Perugia",
    "type": "Devlet",
    "departments": [
      "Social Sciences for Sustainability"
    ],
    fee: "150€ - 3.000€",
    image: "from-blue-600 to-indigo-700",
    description: `Uluslararası öğrenciler için kurulmuş, sosyal bilimler ve İtalyan kültürü üzerine uzmanlaşmış merkez.`,
    website: "https://www.unistrapg.it",
    features: ["Uluslararası Ortam", "Sosyal Bilimler", "Öğrenci Şehri"]
  },
  {
    id: 35,
    name: "University of Naples Parthenope",
    "city": "Napoli",
    "type": "Devlet",
    "departments": [
      "Business Administration",
      "International Business",
      "Tourist Firm Management",
      "Sustainable Blue Economy"
    ],
    fee: "150€ - 3.000€",
    image: "from-sky-500 to-blue-600",
    description: `Napoli'nin denizcilik ve ekonomi geleneğine dayanan, işletme ve mavi ekonomi odaklı üniversite.`,
    website: "https://www.uniparthenope.it",
    features: ["Mavi Ekonomi", "Denizcilik", "İşletme"]
  },
  {
    id: 36,
    name: "University of Salento",
    "city": "Lecce",
    "type": "Devlet",
    "departments": [
      "Digital Management"
    ],
    fee: "150€ - 2.500€",
    image: "from-yellow-500 to-amber-600",
    description: `Güneyin Floransa'sı Lecce'de, dijital dönüşüm ve yönetim üzerine odaklanan modern bir program.`,
    website: "https://www.unisalento.it",
    features: ["Barok Şehir", "Dijital Yönetim", "Güney İtalya"]
  },
  {
    id: 37,
    name: "University of Udine",
    "city": "Udine",
    "type": "Devlet",
    "departments": [
      "Management & Business Analytics"
    ],
    fee: "150€ - 3.000€",
    image: "from-emerald-500 to-green-700",
    description: `Veri analitiği ve işletme yönetimini birleştiren, iş dünyasının ihtiyacına yönelik modern bir program.`,
    website: "https://www.uniud.it",
    features: ["Veri Analizi", "İşletme", "Kuzeydoğu İtalya"]
  },
  {
    id: 38,
    name: "University of Macerata",
    "city": "Macerata",
    "type": "Devlet",
    "departments": [
      "International, European and Comparative Legal Studies"
    ],
    fee: "150€ - 3.000€",
    image: "from-orange-500 to-amber-600",
    description: `Tamamen hukuka ve sosyal bilimlere odaklanmış tarihi bir üniversite.`,
    website: "https://www.unimc.it",
    features: ["Sadece Sosyal Bilimler", "Hukuk", "Tarihi Kampüs"]
  },
  {
    id: 39,
    name: "University of Urbino Carlo Bo",
    "city": "Urbino",
    "type": "Devlet",
    "departments": [
      "Economics and Management"
    ],
    fee: "150€ - 3.000€",
    image: "from-blue-600 to-indigo-700",
    description: `Rönesans'ın beşiği Urbino'da, UNESCO mirası bir şehirde butik ekonomi eğitimi.`,
    website: "https://www.uniurb.it",
    features: ["Rönesans Şehri", "Ekonomi", "UNESCO Mirası"]
  },
  {
    id: 40,
    name: "University of Sassari",
    "city": "Sassari",
    "type": "Devlet",
    "departments": [
      "Computer Engineering"
    ],
    fee: "150€ - 3.000€",
    image: "from-emerald-500 to-green-700",
    description: `Sardinya'nın kuzeyinde, modern bilişim teknolojileri ve sistem tasarımı üzerine odaklanan lisans.`,
    website: "https://www.uniss.it",
    features: ["Bilişim", "Sardinya", "3 Yıllık"]
  },
  {
    id: 41,
    name: "UniCamillus",
    "city": "Roma",
    "type": "Özel",
    "departments": [
      "Medicine",
      "Physiotherapy",
      "Nursing",
      "Midwifery",
      "Biomedical Lab Techniques",
      "Radiotherapy Techniques"
    ],
    fee: "Özel Ücret",
    image: "from-blue-600 to-indigo-700",
    description: `Roma'da sadece sağlık bilimlerine odaklanan, uluslararası öğrencileri hedefleyen özel tıp üniversitesi.`,
    website: "https://www.unicamillus.org",
    features: ["Sadece Sağlık", "Uluslararası", "Roma"]
  },
  {
    id: 42,
    name: "Link Campus University",
    "city": "Roma",
    "type": "Özel",
    "departments": [
      "Business and Institutional Economics",
      "Communication Sciences & Digital Technologies",
      "Political Science & Diplomacy"
    ],
    fee: "Özel Ücret",
    image: "from-red-700 to-orange-800",
    description: `Roma'da spor ve diplomasi alanlarında güçlü, modern eğitim tekniklerini kullanan özel üniversite.`,
    website: "https://www.unilink.it",
    features: ["Diplomasi", "Dijital Medya", "Spor Odaklı"]
  },
  {
    id: 43,
    name: "European University of Rome",
    "city": "Roma",
    "type": "Özel",
    "departments": [
      "Economics and Business Management",
      "Tourism and Local Development"
    ],
    fee: "Özel Ücret",
    image: "from-blue-600 to-indigo-700",
    description: `Roma'da butik eğitim veren, öğrencileriyle birebir ilgilenen özel bir kampüs üniversitesi.`,
    website: "https://www.unier.it",
    features: ["Butik Eğitim", "Kariyer Odaklı", "Roma"]
  },
  {
    id: 44,
    name: "IULM University",
    "city": "Milano",
    "type": "Özel",
    "departments": [
      "Corporate Communication and Public Relations"
    ],
    fee: "Özel Ücret",
    image: "from-red-700 to-orange-800",
    description: `Milano'da iletişim, medya ve halkla ilişkiler alanında lider özel üniversite.`,
    website: "https://www.iulm.it",
    features: ["İletişim Lideri", "Medya", "Milano"]
  },
  {
    id: 45,
    name: "University of Gastronomic Sciences",
    "city": "Pollenzo",
    "type": "Özel",
    "departments": [
      "Gastronomic Sciences and Cultures"
    ],
    fee: "Özel Ücret",
    image: "from-emerald-500 to-green-700",
    description: `Slow Food hareketi tarafından kurulan, dünyanın ilk gastronomi üniversitesi.`,
    website: "https://www.unisg.it",
    features: ["Gastronomi", "Gıda Kültürü", "Butik"]
  }
];