// ── REST Countries API Service ──────────────────────────────────────────────
// Fetches real-time flags, capitals, continents, and country data

export interface CountryQuizItem {
  id: string;
  name: string;
  capital: string;
  flagSvg: string;
  region: string;
  options: string[];
}

export async function fetchCountriesQuizData(count: number = 10): Promise<CountryQuizItem[]> {
  try {
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,capital,flags,region');
    if (!res.ok) throw new Error('REST Countries API error');

    const data = await res.json();
    const validCountries = data.filter((c: any) => c.capital && c.capital.length > 0 && c.flags?.svg);

    // Shuffle and pick
    const shuffled = validCountries.sort(() => Math.random() - 0.5).slice(0, count);

    return shuffled.map((country: any, idx: number) => {
      const countryName = country.name.common;
      const capital = country.capital[0];
      const flagSvg = country.flags.svg;

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
        region: country.region,
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
