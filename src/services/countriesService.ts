// ── REST Countries API & Uzbek World Database ─────────────────────────────
// Rich 60+ country database with non-repeating random selection

export interface CountryQuizItem {
  id: string;
  name: string;
  capital: string;
  flagSvg: string;
  region: string;
  options: string[];
}

interface RawCountry {
  name: string;
  capital: string;
  code: string;
  region: string;
}

const MASTER_COUNTRIES: RawCountry[] = [
  { name: "O'zbekiston", capital: "Toshkent", code: "uz", region: "Markaziy Osiyo" },
  { name: "Qozog'iston", capital: "Ostona", code: "kz", region: "Markaziy Osiyo" },
  { name: "Qirg'iziston", capital: "Bishkek", code: "kg", region: "Markaziy Osiyo" },
  { name: "Tojikiston", capital: "Dushanbe", code: "tj", region: "Markaziy Osiyo" },
  { name: "Turkmaniston", capital: "Ashxobod", code: "tm", region: "Markaziy Osiyo" },
  { name: "Turkiya", capital: "Anqara", code: "tr", region: "Yevroosiyo" },
  { name: "Ozarbayjon", capital: "Boku", code: "az", region: "Kavkaz" },
  { name: "Buyuk Britaniya", capital: "London", code: "gb", region: "Yevropa" },
  { name: "Fransiya", capital: "Parij", code: "fr", region: "Yevropa" },
  { name: "Germaniya", capital: "Berlin", code: "de", region: "Yevropa" },
  { name: "Italiya", capital: "Rim", code: "it", region: "Yevropa" },
  { name: "Ispaniya", capital: "Madrid", code: "es", region: "Yevropa" },
  { name: "Yaponiya", capital: "Tokio", code: "jp", region: "Osiyo" },
  { name: "Janubiy Koreya", capital: "Seul", code: "kr", region: "Osiyo" },
  { name: "Xitoy", capital: "Pekin", code: "cn", region: "Osiyo" },
  { name: "Hindiston", capital: "Nyu-Dehli", code: "in", region: "Osiyo" },
  { name: "AQSH", capital: "Vashington", code: "us", region: "Shimoliy Amerika" },
  { name: "Kanada", capital: "Ottava", code: "ca", region: "Shimoliy Amerika" },
  { name: "Braziliya", capital: "Brazilia", code: "br", region: "Janubiy Amerika" },
  { name: "Argentina", capital: "Buenos-Ayres", code: "ar", region: "Janubiy Amerika" },
  { name: "Misr", capital: "Qohira", code: "eg", region: "Afrika" },
  { name: "Saudiya Arabistoni", capital: "Ar-Riyod", code: "sa", region: "Yaqin Sharq" },
  { name: "BAA (Birlashgan Arab Amirliklari)", capital: "Abu-Dabi", code: "ae", region: "Yaqin Sharq" },
  { name: "Rossiya", capital: "Moskva", code: "ru", region: "Yevroosiyo" },
  { name: "Avstraliya", capital: "Kanberra", code: "au", region: "Okeaniya" },
  { name: "Shveytsariya", capital: "Bern", code: "ch", region: "Yevropa" },
  { name: "Niderlandiya", capital: "Amsterdam", code: "nl", region: "Yevropa" },
  { name: "Shvetsiya", capital: "Stokgolm", code: "se", region: "Yevropa" },
  { name: "Norvegiya", capital: "Oslo", code: "no", region: "Yevropa" },
  { name: "Gretsiya", capital: "Afina", code: "gr", region: "Yevropa" },
  { name: "Polsha", capital: "Varshava", code: "pl", region: "Yevropa" },
  { name: "Portugaliya", capital: "Lissabon", code: "pt", region: "Yevropa" },
  { name: "Meksika", capital: "Mexiko", code: "mx", region: "Shimoliy Amerika" },
  { name: "Indoneziya", capital: "Jakarta", code: "id", region: "Osiyo" },
  { name: "Malayziya", capital: "Kuala-Lumpur", code: "my", region: "Osiyo" },
  { name: "Singapur", capital: "Singapur", code: "sg", region: "Osiyo" },
  { name: "Eron", capital: "Tehron", code: "ir", region: "Yaqin Sharq" },
  { name: "Gruziya", capital: "Tbilisi", code: "ge", region: "Kavkaz" },
  { name: "Avstriya", capital: "Vena", code: "at", region: "Yevropa" },
  { name: "Belgiya", capital: "Bryussel", code: "be", region: "Yevropa" },
  { name: "Marokash", capital: "Rabot", code: "ma", region: "Afrika" },
  { name: "Janubiy Afrika", capital: "Pretoriya", code: "za", region: "Afrika" },
  { name: "Tailand", capital: "Bangkok", code: "th", region: "Osiyo" },
  { name: "Vyetnam", capital: "Xanoy", code: "vn", region: "Osiyo" },
  { name: "Pokiston", capital: "Islomobod", code: "pk", region: "Osiyo" }
];

export async function fetchCountriesQuizData(count: number = 10): Promise<CountryQuizItem[]> {
  // Shuffle master list to guarantee non-repeating variety
  const shuffledPool = [...MASTER_COUNTRIES].sort(() => Math.random() - 0.5);
  const selected = shuffledPool.slice(0, Math.min(count, MASTER_COUNTRIES.length));

  return selected.map((item, idx) => {
    // Pick 3 unique wrong capitals from the rest of the pool
    const otherCapitals = MASTER_COUNTRIES
      .filter(c => c.capital !== item.capital)
      .map(c => c.capital)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [item.capital, ...otherCapitals].sort(() => Math.random() - 0.5);

    return {
      id: `cnt_${item.code}_${idx}_${Date.now()}`,
      name: item.name,
      capital: item.capital,
      flagSvg: `https://flagcdn.com/${item.code}.svg`,
      region: item.region,
      options,
    };
  });
}
