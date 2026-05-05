// ============================================================
// Adam Asmaca - Kelime Veritabanı
// ============================================================

const WORD_DATABASE = {
    hayvanlar: {
        name: "Hayvanlar",
        icon: "🐾",
        words: [
            "aslan", "ayı", "kuş", "kedi", "balık", "kurt", "fare", "inek", "eşek", "koyun",
            "geyik", "tavuk", "ördek", "domuz", "arı", "fil", "köpek", "tilki", "kartal", "yılan",
            "puma", "fok", "koala", "karga", "baykuş", "şahin", "doğan", "turna", "leylek",
            "penguen", "zürafa", "pelikan", "ahtapot", "kanarya", "flamingo", "bukalemun", "sincap",
            "papağan", "karınca", "kelebek", "çakal", "serçe", "gergedan", "tavşan", "timsah",
            "kertenkele", "hipopotam", "orangutan", "yusufçuk", "kanguru", "kameleon", "dinozor",
            "istakoz", "karınca yiyen", "su aygırı"
        ]
    },
    sehirler: {
        name: "Şehirler",
        icon: "🏙️",
        words: [
            "bolu", "muş", "iğdır", "rize", "burdur", "van", "ordu", "tokat", "sinop", "uşak",
            "niğde", "kars", "bitlis", "artvin", "yalova", "izmir", "sivas", "aydın", "hatay",
            "ankara", "bursa", "adana", "antalya", "trabzon", "kayseri", "konya", "samsun",
            "malatya", "denizli", "sakarya", "isparta", "kocaeli", "mardin", "edirne", "mersin",
            "istanbul", "eskişehir", "diyarbakır", "zonguldak", "afyonkarahisar", "kahramanmaraş",
            "kırklareli", "çanakkale", "kastamonu", "gaziantep", "şanlıurfa", "balıkesir"
        ]
    },
    yiyecekler: {
        name: "Yiyecekler",
        icon: "🍕",
        words: [
            "pilav", "kebap", "ekmek", "pizza", "börek", "çorba", "makarna", "salata", "simit",
            "tavuk", "balık", "cacık", "pide", "döner", "mantı", "sosis", "sucuk", "peynir", "kavun",
            "baklava", "sarma", "künefe", "dolma", "köfte", "tantuni", "sütlaç", "kadayıf",
            "gözleme", "mercimek", "kurabiye", "lahmacun", "kokoreç", "menemen", "kumpir", "tarhana",
            "iskender", "hünkarbeğendi", "karnıyarık", "çiğköfte", "patlıcan musakka", "imam bayıldı",
            "profiterol", "kazandibi", "şekerpare", "su böreği", "yaprak sarma"
        ]
    },
    teknoloji: {
        name: "Teknoloji",
        icon: "💻",
        words: [
            "bilgi", "veri", "ağ", "ram", "usb", "ekran", "tuş", "fare", "disk", "wifi",
            "piksel", "robot", "kod", "byte", "bulut", "çip", "kasa", "lens", "kablo",
            "yazılım", "sunucu", "modem", "tablet", "donanım", "program", "şifre", "güncelleme",
            "arayüz", "internet", "telefon", "bilgisayar", "klavye", "kamera", "batarya", "sensör",
            "algoritma", "veritabanı", "işlemci", "uygulamalar", "tarayıcı", "yapay zeka",
            "siber güvenlik", "kriptografi", "mikroçip", "anakart", "işletim sistemi"
        ]
    },
    filmler: {
        name: "Türk Filmleri",
        icon: "🎬",
        words: [
            // Kolay (3-5 harf)
            "yol", "umut", "sürü", "zübük", "davaro", "salako", "şaban", "kibar", "feyzo",
            "kuyu", "maske", "eşkiya", "pardon", "vizon", "gora", "arog", "hokkabaz",
            // Orta (6-8 harf)
            "eşkıya", "şabaniye", "namuslu", "arabesk", "muhsin", "züğürt", "kibar feyzo",
            "tosun paşa", "şekerpare", "propaganda", "vizontele", "av mevsimi",
            // Zor (9+ harf)
            "hababam sınıfı", "neşeli günler", "süt kardeşler", "bizim aile", "çöpçüler kralı",
            "selvi boylum al yazmalım", "kapıcılar kralı", "muhsin bey", "gönül yarası",
            "kış uykusu", "kelebeğin rüyası", "organize işler", "babam ve oğlum", "yedinci koğuştaki mucize"
        ]
    },
    sporlar: {
        name: "Sporlar",
        icon: "⚽",
        words: [
            "futbol", "tenis", "golf", "kayak", "yüzme", "boks", "judo", "okçu", "güreş", "sumo",
            "dart", "sörf", "polo", "karete", "ralli",
            "voleybol", "basketbol", "hentbol", "atletizm", "badminton", "bisiklet", "eskrim",
            "jimnastik", "kürek", "halter", "hokey", "bowling", "snooker", "bilardo", "kaykay",
            "taekwondo", "pentathlon", "triatlon", "binicilik", "oryantiring", "paraşüt",
            "masa tenisi", "su topu", "buz pateni", "dağcılık", "yelkencilik"
        ]
    },
    meslekler: {
        name: "Meslekler",
        icon: "👨‍💼",
        words: [
            "pilot", "aşçı", "doktor", "hemşire", "avukat", "müdür", "şoför", "garson", "polis",
            "asker", "terzi", "berber", "kasap", "manav", "bakkal", "yazar", "çizer", "hakim",
            "mühendis", "öğretmen", "eczacı", "mimar", "asistan", "cerrah", "psikolog", "gazeteci",
            "ressam", "heykeltraş", "oyuncu", "şarkıcı", "çiftçi", "marangoz", "tesisatçı",
            "arkeolog", "astronot", "veteriner", "fizyoterapist", "meteorolog", "programcı",
            "akademisyen", "koreograf", "illüstratör", "kütüphaneci", "tasarımcı"
        ]
    }
};

// Zorluk seviyesi filtresi (boşlukları saymadan uzunluk kontrolü)
function getFilteredWords(category, difficulty) {
    const words = WORD_DATABASE[category].words;
    switch (difficulty) {
        case 'easy':
            return words.filter(w => w.replace(/\s/g, '').length >= 3 && w.replace(/\s/g, '').length <= 5);
        case 'medium':
            return words.filter(w => w.replace(/\s/g, '').length >= 6 && w.replace(/\s/g, '').length <= 8);
        case 'hard':
            return words.filter(w => w.replace(/\s/g, '').length >= 9);
        default:
            return words;
    }
}

// Rastgele kategori seç
function getRandomCategory() {
    const keys = Object.keys(WORD_DATABASE);
    return keys[Math.floor(Math.random() * keys.length)];
}

// Rastgele kelime seç (kategori ve zorluk seviyesine göre)
function getRandomWord(category, difficulty) {
    const filtered = getFilteredWords(category, difficulty);
    if (filtered.length === 0) {
        const allWords = WORD_DATABASE[category].words;
        return allWords[Math.floor(Math.random() * allWords.length)];
    }
    return filtered[Math.floor(Math.random() * filtered.length)];
}
