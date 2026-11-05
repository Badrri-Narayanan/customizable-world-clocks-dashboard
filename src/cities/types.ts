export type City = {
  id: string;
  name: string;
  province: string;
  country: string;
  iso2: string;
  zone: string;
  pop: number;
};

export type CityMappingEntry = {
  city: string;
  city_ascii: string;
  province: string;
  country: string;
  iso2: string;
  iso3?: string;
  timezone: string;
  pop: number;
};
