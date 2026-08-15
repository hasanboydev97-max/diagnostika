// ── REST Countries API Service with Uzbek Localization ────────────────────

export interface CountryQuizItem {
  id: string;
  name: string;
  capital: string;
  flagSvg: string;
  region: string;
  options: string[];
}

const COUNTRY_NAME_UZ: Record<string, string> = {
  'Uzbekistan': 'O\'zbekiston',
  'United Kingdom': 'Buyuk Britaniya',
  'United States': 'AQSH',
  'Japan': 'Yaponiya',
  'Germany': 'Germaniya',
  'France': 'Fransiya',
  'Italy': 'Italiya',
  'Spain': 'Ispaniya',
  'China': 'Xitoy',
  'Russia': 'Rossiya',
  'Turkey': 'Turkiya',
  'Egypt': 'Misr',
  'South Korea': 'Janubiy Koreya',
  'India': 'Hindiston',
  'Brazil': 'Braziliya',
  'Canada': 'Kanada',
};

const REGION_UZ: Record<string, string> = {
  'Asia': 'Osiyo',
  'Europe': 'Yevropa',
  'Africa': 'Afrika',
  'Americas': 'Amerika',
  'Oceania': 'Okeaniya',
};

export async function fetchCountriesQuizData(count: number = 10): Promise<CountryQuizItem[]> {
  try {
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,flags,region');
    if (!res.ok) throw new Error('REST Countries API error');

    const data = await res.json();
    const validCountries = data.filter((c: any) => c.capital && c.capital.length > 0 && c.flags?.svg);

    // Shuffle and pick
    const shuffled = validCountries.sort(() => Math.random() - 0.5).slice(0, count);

    return shuffled.map((country: any, idx: number) => {
      const rawName = country.name.common;
      const countryName = COUNTRY_NAME_UZ[rawName] || rawName;
      const capital = country.capital[0];
      const flagSvg = country.flags.svg;
      const region = REGION_UZ[country.region] || country.region;

      // Generate 3 wrong capitals
      const wrongCapitals = validCountries
        .filter((c: any) => c.capital[0] !== capital)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c: any) => c.capital[0]);

      const options = [capital, ...wrongCapitals].sort(() => Math.random() - 0.5);

      return {
        id: `cnt_${idx}_${Date.now()}`,
        name: countryName,
        capital,
        flagSvg,
        region,
        options,
      };
    });
  } catch (error) {
    console.warn('[CountriesService] Fetch error, returning fallbacks:', error);
    return getFallbackCountries();
  }
}

function getFallbackCountries(): CountryQuizItem[] {
  return [
    {
      id: 'fb_cnt_1',
      name: 'O\'zbekiston',
      capital: 'Toshkent',
      flagSvg: 'https://flagcdn.com/uz.svg',
      region: 'Osiyo',
      options: ['Toshkent', 'Samarqand', 'Buxoro', 'Farg\'ona'],
    },
    {
      id: 'fb_cnt_2',
      name: 'Buyuk Britaniya',
      capital: 'London',
      flagSvg: 'https://flagcdn.com/gb.svg',
      region: 'Yevropa',
      options: ['London', 'Parij', 'Berlin', 'Madrid'],
    },
    {
      id: 'fb_cnt_3',
      name: 'Yaponiya',
      capital: 'Tokio',
      flagSvg: 'https://flagcdn.com/jp.svg',
      region: 'Osiyo',
      options: ['Tokio', 'Seul', 'Pekin', 'Bangkok'],
    },
  ];
}
