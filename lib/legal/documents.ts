// ItalyPath yasal belgeleri (Türkçe).
// Metinler yapılandırılmış tutulur ki ileride İngilizce çeviri aynı şekle eklenebilsin.
export const CONTACT_EMAIL = "contact@italypath.com";
export const LEGAL_LAST_UPDATED = "20 Temmuz 2026";

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  /** SEO için kısa açıklama */
  description: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
};

const privacy: LegalDocument = {
  slug: "gizlilik",
  title: "Gizlilik Politikası ve Aydınlatma Metni",
  description:
    "ItalyPath olarak hangi kişisel verilerinizi topladığımızı, nasıl kullandığımızı ve KVKK kapsamındaki haklarınızı açıklarız.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "Bu metin, ItalyPath’i (“Platform”) kullandığınızda kişisel verilerinizin nasıl işlendiğini açıklar. Aynı zamanda 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında aydınlatma yükümlülüğünü yerine getirir.",
    "Platform’u kullanarak bu metinde anlatılan veri işleme faaliyetleri hakkında bilgilendirildiğinizi kabul edersiniz.",
  ],
  sections: [
    {
      heading: "1. Veri Sorumlusu",
      paragraphs: [
        "Kişisel verileriniz, veri sorumlusu sıfatıyla Kerem Yarar tarafından işlenmektedir. ItalyPath bir bilgilendirme ve rehberlik platformudur; bağlı olduğu bir şirket bulunmamaktadır.",
        `Her türlü soru ve başvurunuz için iletişim adresi: ${CONTACT_EMAIL}.`,
      ],
    },
    {
      heading: "2. Hangi Kişisel Verileri Topluyoruz?",
      paragraphs: [
        "Platform’u nasıl kullandığınıza bağlı olarak aşağıdaki verileri işleriz:",
        "Gönüllü mentor görüşmelerinin bu sürümünde mesajlarla belge veya dosya eki alınmaz.",
      ],
      list: [
        "Hesap bilgileri: Üye olduğunuzda kimlik doğrulama hizmetimiz aracılığıyla e-posta adresiniz ve adınız.",
        "Favorileriniz: İşaretlediğiniz üniversite ve programlar.",
        "Yüklediğiniz belgeler: Belge cüzdanına yüklediğiniz dosyalar ve bunlara ait bilgiler.",
        "Yapay zeka mentor mesajları: AI mentora yazdığınız sorular ve mesaj içerikleri.",
        "Gönüllü mentor görüşmeleri: Gönüllü masaya yazdığınız mesajlar, görüşme konusu, görüşme durumu ve ItalyPath Gönüllü Ekibinin yanıtları.",
        "Tarayıcı tercihleri: Dil seçiminiz, görünüm tercihiniz gibi ayarlar cihazınızın tarayıcı hafızasında (localStorage) saklanır.",
      ],
    },
    {
      heading: "3. Kişisel Verileri Hangi Amaçlarla İşliyoruz?",
      list: [
        "Üyelik hesabınızı oluşturmak ve güvenli girişi sağlamak,",
        "Favorilerinizi ve yüklediğiniz belgeleri size sunmak ve saklamak,",
        "Yapay zeka mentor üzerinden sorularınıza yanıt üretmek,",
        "Site içindeki insan gönüllü görüşmesini yürütmek ve görüşme geçmişini hesabınıza sunmak,",
        "Gönüllü mentor görüşmelerini yetkilendirilmiş ItalyPath operatörünün okuyup yanıtlayabildiği site içi akışla yürütmek,",
        "Dil ve görünüm gibi tercihlerinizi hatırlamak,",
        "Platform’un güvenliğini sağlamak ve hizmeti geliştirmek.",
      ],
    },
    {
      heading: "4. Verilerin Üçüncü Taraflarla Paylaşımı ve Yurt Dışına Aktarım",
      paragraphs: [
        "Platform’u çalıştırmak için bazı hizmetleri dış sağlayıcılardan alırız. Verileriniz yalnızca hizmetin gerektirdiği ölçüde bu sağlayıcılarla paylaşılır:",
      ],
      list: [
        "Kimlik doğrulama hizmeti: üyelik ve güvenli giriş için,",
        "Bulut veri saklama hizmeti: favorileriniz, yüklediğiniz belgeler ve gönüllü mentor görüşmeleriniz için,",
        "Yapay zeka hizmeti: AI mentora yazdığınız mesajlar, yanıt üretilmesi amacıyla bu hizmete iletilir.",
      ],
    },
    {
      heading: "",
      paragraphs: [
        "Bu hizmet sağlayıcıların sunucuları yurt dışında bulunabilir. Bu durumda kişisel verileriniz, hizmetin sağlanabilmesi amacıyla yurt dışına aktarılmış olur. Verilerinizi pazarlama amacıyla üçüncü kişilere satmayız.",
      ],
    },
    {
      heading: "5. Verilerin Saklanma Süresi",
      paragraphs: [
        "Kişisel verilerinizi, hesabınız aktif olduğu ve işleme amaçları için gerekli olduğu sürece saklarız. Hesabınızı veya yüklediğiniz belgeleri sildiğinizde ilgili veriler kaldırılır. Yasal saklama yükümlülükleri olması hâlinde veriler ilgili süre boyunca saklanabilir.",
        "Gönüllü mentor görüşmeleri, görüşme kapandıktan sonra da hesabınız aktif olduğu sürece geçmişinizde tutulur. Hesap veya veri silme talebiniz uygulandığında bu görüşmeler ve bağlı mesajlar da kaldırılır.",
      ],
    },
    {
      heading: "6. Veri Güvenliği",
      paragraphs: [
        "Kişisel verilerinizi yetkisiz erişime, kayba ve kötüye kullanıma karşı korumak için makul teknik ve idari tedbirleri alırız. Yüklediğiniz belgeler özel (private) alanda saklanır ve yalnızca sizin erişiminize sunulur.",
      ],
    },
    {
      heading: "7. KVKK Kapsamındaki Haklarınız",
      paragraphs: [
        "KVKK’nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:",
      ],
      list: [
        "Kişisel verinizin işlenip işlenmediğini öğrenme,",
        "İşlenmişse buna ilişkin bilgi talep etme,",
        "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,",
        "Verilerin aktarıldığı üçüncü kişileri bilme,",
        "Eksik veya yanlış işlenmişse düzeltilmesini isteme,",
        "Şartları oluştuğunda verilerin silinmesini veya yok edilmesini isteme,",
        "Bu işlemlerin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,",
        "İşlenen verilerin münhasıran otomatik sistemlerle analizi sonucu aleyhinize bir sonuç çıkmasına itiraz etme,",
        "Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme.",
      ],
    },
    {
      heading: "8. Haklarınızı Nasıl Kullanabilirsiniz?",
      paragraphs: [
        `Yukarıdaki haklarınıza ilişkin taleplerinizi ${CONTACT_EMAIL} adresine iletebilirsiniz. Talebiniz, KVKK’da öngörülen süre içinde ücretsiz olarak sonuçlandırılır.`,
      ],
    },
    {
      heading: "9. Değişiklikler",
      paragraphs: [
        "Bu metni zaman zaman güncelleyebiliriz. Güncel sürüm her zaman bu sayfada yayımlanır ve yürürlük tarihi en üstte belirtilir.",
      ],
    },
  ],
};

const terms: LegalDocument = {
  slug: "kullanim-kosullari",
  title: "Kullanım Koşulları",
  description:
    "ItalyPath’i kullanırken geçerli olan koşullar, sorumluluk reddi ve mentor masaları hakkında bilmeniz gerekenler.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "Bu Kullanım Koşulları, ItalyPath’i (“Platform”) kullanımınızı düzenler. Platform’u kullanarak bu koşulları kabul etmiş sayılırsınız.",
  ],
  sections: [
    {
      heading: "1. Hizmetin Tanımı",
      paragraphs: [
        "ItalyPath, İtalya’da eğitim almak isteyen öğrencilere yönelik bir bilgilendirme ve rehberlik platformudur. Üniversite ve program bilgileri, şehir rehberleri, burs bilgileri, hesaplama araçları, yapay zeka destekli bir mentor ve site içi insan gönüllü yazışması sunar.",
      ],
    },
    {
      heading: "2. Bilgilerin Doğruluğu ve Sorumluluk Reddi",
      paragraphs: [
        "Platform’daki üniversite, program, başvuru, kabul koşulu ve burs bilgileri yalnızca bilgilendirme amaçlıdır ve bağlayıcı değildir. Bu bilgiler zamanla değişebilir.",
        "Önemli bir karar vermeden önce ilgili bilgiyi mutlaka üniversitenin veya kurumun resmî kaynaklarından teyit etmelisiniz. Platform’daki bilgilere dayanarak verdiğiniz kararlardan doğan sonuçlardan sorumluluk kabul edilmez.",
      ],
    },
    {
      heading: "3. Mentor Masaları Hakkında",
      paragraphs: [
        "Yapay zeka mentor, otomatik olarak yanıt üreten bir yardımcıdır. Verdiği yanıtlar hatalı, eksik veya güncel olmayan bilgiler içerebilir.",
        "Gönüllü mentor masası, öğrenci deneyimine dayalı genel rehberlik sunan site içi bir insan yazışmasıdır. Yanıtların anlık, eksiksiz veya resmî olduğu garanti edilmez.",
        "Yapay zeka ve insan gönüllü mentor profesyonel danışmanlık, hukuki görüş, kişiye özel mali değerlendirme veya resmî başvuru rehberliği yerine geçmez. Önemli bilgileri her zaman resmî kaynaklardan doğrulayın.",
      ],
    },
    {
      heading: "4. Kullanıcı Yükümlülükleri",
      list: [
        "Üyelik sırasında doğru ve güncel bilgi vermek,",
        "Hesap güvenliğinizi korumak ve giriş bilgilerinizi paylaşmamak,",
        "Platform’u yürürlükteki mevzuata ve bu koşullara uygun kullanmak,",
        "Platform’un işleyişini bozacak veya başkalarının haklarını ihlal edecek davranışlardan kaçınmak,",
        "Yalnızca size ait olan veya paylaşma hakkına sahip olduğunuz belgeleri yüklemek.",
      ],
    },
    {
      heading: "5. Hesap ve Yüklediğiniz İçerik",
      paragraphs: [
        "Belge cüzdanına yüklediğiniz dosyalardan ve içeriklerden tamamen siz sorumlusunuz. Hukuka aykırı, başkasının haklarını ihlal eden veya zararlı içerik yüklemeniz yasaktır.",
        "Kapattığınız gönüllü mentor görüşmeleri, hesabınız aktif olduğu sürece salt okunur geçmişinizde tutulur; hesap veya veri silme talebiniz uygulandığında kaldırılır.",
      ],
    },
    {
      heading: "6. Fikri Mülkiyet",
      paragraphs: [
        "Platform’un tasarımı, metinleri, derlediği içerik ve markası ItalyPath’e aittir. İzinsiz olarak kopyalanamaz, çoğaltılamaz veya ticari amaçla kullanılamaz. Yüklediğiniz kendi belgeleriniz size ait olmaya devam eder.",
      ],
    },
    {
      heading: "7. Sorumluluğun Sınırlandırılması",
      paragraphs: [
        "Platform “olduğu gibi” sunulur. Hizmetin kesintisiz veya hatasız olacağı garanti edilmez. Mevzuatın izin verdiği ölçüde, Platform’un kullanımından doğan dolaylı zararlardan sorumluluk kabul edilmez.",
      ],
    },
    {
      heading: "8. Değişiklikler",
      paragraphs: [
        "Bu koşulları zaman zaman güncelleyebiliriz. Güncel sürüm her zaman bu sayfada yayımlanır. Değişikliklerin ardından Platform’u kullanmaya devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.",
      ],
    },
    {
      heading: "9. Uygulanacak Hukuk",
      paragraphs: [
        "Bu koşullar Türkiye Cumhuriyeti hukukuna tabidir. Doğabilecek uyuşmazlıklarda Türkiye’deki yetkili mahkemeler ve icra daireleri yetkilidir.",
      ],
    },
    {
      heading: "10. İletişim",
      paragraphs: [
        `Bu koşullarla ilgili sorularınız için ${CONTACT_EMAIL} adresine yazabilirsiniz.`,
      ],
    },
  ],
};

const cookies: LegalDocument = {
  slug: "cerez-politikasi",
  title: "Çerez Politikası",
  description:
    "ItalyPath’in çerezleri ve tarayıcı hafızasını nasıl kullandığını ve bunları nasıl yönetebileceğinizi açıklar.",
  lastUpdated: LEGAL_LAST_UPDATED,
  intro: [
    "Bu Çerez Politikası, ItalyPath’in (“Platform”) çerezleri ve benzeri teknolojileri nasıl kullandığını açıklar.",
  ],
  sections: [
    {
      heading: "1. Çerez ve Benzeri Teknolojiler Nedir?",
      paragraphs: [
        "Çerezler, bir web sitesini ziyaret ettiğinizde cihazınıza kaydedilen küçük dosyalardır. Tarayıcı hafızası (localStorage) ise tercihlerinizi cihazınızda saklayan benzer bir teknolojidir. Bu teknolojiler sitenin düzgün çalışmasına ve tercihlerinizin hatırlanmasına yardımcı olur.",
      ],
    },
    {
      heading: "2. Hangi Teknolojileri Kullanıyoruz?",
      list: [
        "Zorunlu oturum çerezleri: Üye girişi ve güvenliğin sağlanması için gereklidir. Bunlar olmadan giriş yapılamaz.",
        "Tercih ve işlevsellik hafızası: Dil seçiminiz, görünüm tercihiniz, favorileriniz gibi ayarlar tarayıcı hafızanızda (localStorage) saklanır; böylece tekrar geldiğinizde tercihleriniz korunur.",
      ],
    },
    {
      heading: "",
      paragraphs: [
        "Sitenin nasıl kullanıldığını anlamak için çerez kullanmayan, anonim bir ziyaret istatistiği aracı kullanıyoruz. Bu araç cihazınıza çerez yerleştirmez, kişisel veri toplamaz ve sizi başka sitelerde takip etmez; yalnızca toplu ve anonim kullanım verisi (ör. hangi sayfaların ne sıklıkta görüntülendiği) üretir.",
        "Şu anda reklam veya pazarlama amaçlı çerez kullanmıyoruz. Bu durum değişirse bu politika güncellenir.",
      ],
    },
    {
      heading: "3. Çerezleri Nasıl Yönetebilirsiniz?",
      paragraphs: [
        "Tarayıcınızın ayarlarından çerezleri ve site verilerini silebilir veya engelleyebilirsiniz. Ancak zorunlu oturum çerezlerini engellerseniz üye girişi ve bazı özellikler çalışmayabilir.",
      ],
    },
    {
      heading: "4. Değişiklikler",
      paragraphs: [
        "Bu politikayı zaman zaman güncelleyebiliriz. Güncel sürüm her zaman bu sayfada yayımlanır.",
      ],
    },
    {
      heading: "5. İletişim",
      paragraphs: [
        `Çerezlerle ilgili sorularınız için ${CONTACT_EMAIL} adresine yazabilirsiniz.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [privacy, terms, cookies];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}

/** Footer ve sitemap için sade liste */
export const LEGAL_LINKS = LEGAL_DOCUMENTS.map((doc) => ({
  slug: doc.slug,
  title: doc.title,
  href: `/yasal/${doc.slug}`,
}));
