export const PROFILE_PROJECTION =
  "id name gender gender_probability age age_group country_id country_name country_probability created_at";

const COUNTRIES = {
  nigeria: "NG",
  nigerian: "NG",
  kenya: "KE",
  kenyan: "KE",
  ghana: "GH",
  ghanaian: "GH",
  angola: "AO",
  angolan: "AO",
  america: "US",
  usa: "US",
  "united states": "US",
  "south africa": "ZA",
  "south african": "ZA",
};

export function serializeProfile(p) {
  return {
    id: p.id || String(p._id),
    name: p.name,
    gender: p.gender,
    gender_probability: p.gender_probability,
    age: p.age,
    age_group: p.age_group,
    country_id: p.country_id,
    country_name: p.country_name,
    country_probability: p.country_probability,
    created_at: p.created_at,
  };
}

export function parseSearchQuery(q) {
  const text = String(q || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const filter = {};

  if (/\b(female|females|woman|women|girl|girls)\b/.test(text)) {
    filter.gender = "female";
  } else if (/\b(male|males|man|men|boy|boys)\b/.test(text)) {
    filter.gender = "male";
  }

  const between = text.match(/(?:between ages?|aged|age)\s*(\d{1,3})\s*(?:-|to|and)\s*(\d{1,3})/);
  if (between) {
    filter.age = { $gte: Number(between[1]), $lte: Number(between[2]) };
  } else {
    const above = text.match(/(?:above|over|older than)\s*(\d{1,3})/);
    const below = text.match(/(?:below|under|younger than)\s*(\d{1,3})/);

    if (above) filter.age = { ...(filter.age || {}), $gte: Number(above[1]) };
    if (below) filter.age = { ...(filter.age || {}), $lte: Number(below[1]) };
  }

  if (text.includes("young") && !filter.age) {
    filter.age = { $gte: 18, $lte: 35 };
  }

  if (text.includes("adult")) filter.age_group = "adult";
  if (text.includes("teenager")) filter.age_group = "teenager";
  if (text.includes("senior")) filter.age_group = "senior";

  for (const [name, code] of Object.entries(COUNTRIES)) {
    if (text.includes(name)) {
      filter.country_id = code;
      break;
    }
  }

  return filter;
}

export function parseListFilters(searchParams) {
  const filter = {};

  const gender = searchParams.get("gender");
  const country = searchParams.get("country_id") || searchParams.get("country");
  const ageGroup = searchParams.get("age_group") || searchParams.get("age-group");
  const minAge = searchParams.get("min_age") || searchParams.get("min-age");
  const maxAge = searchParams.get("max_age") || searchParams.get("max-age");

  if (gender) filter.gender = gender.toLowerCase();
  if (country) filter.country_id = country.toUpperCase();
  if (ageGroup) filter.age_group = ageGroup.toLowerCase();

  if (minAge || maxAge) {
    filter.age = {};
    if (minAge) filter.age.$gte = Number(minAge);
    if (maxAge) filter.age.$lte = Number(maxAge);
  }

  return normalizeFilter(filter);
}

export function normalizeFilter(filter) {
  const normalized = {};

  if (filter.gender) normalized.gender = String(filter.gender).toLowerCase();
  if (filter.age_group) normalized.age_group = String(filter.age_group).toLowerCase();
  if (filter.country_id) normalized.country_id = String(filter.country_id).toUpperCase();

  if (filter.age) {
    normalized.age = {};
    if (filter.age.$gte !== undefined) normalized.age.$gte = Number(filter.age.$gte);
    if (filter.age.$lte !== undefined) normalized.age.$lte = Number(filter.age.$lte);
  }

  if (filter.name) normalized.name = filter.name;

  return normalized;
}

export function stableCacheKey(scope, payload) {
  return `${scope}:${JSON.stringify(sortKeys(payload))}`;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }

  return value;
}
