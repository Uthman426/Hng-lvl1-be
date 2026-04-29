import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { jsonResponse } from "@/lib/response";
import { requireApiVersion, requireAuth } from "@/lib/guards";

function parseQuery(q) {
  const text = q.toLowerCase();
  const filter = {};

  if (text.includes("female")) {
    filter.gender = "female";
  } else if (text.includes("male")) {
    filter.gender = "male";
  }

  if (text.includes("young")) {
    filter.age = { $gte: 16, $lte: 24 };
  }

  const aboveMatch = text.match(/above (\d+)/);
  if (aboveMatch) {
    filter.age = { $gte: Number(aboveMatch[1]) };
  }

  if (text.includes("adult")) filter.age_group = "adult";
  if (text.includes("teenager")) filter.age_group = "teenager";

  const countries = {
    nigeria: "NG",
    kenya: "KE",
    angola: "AO",
    ghana: "GH",
    america: "US",
    usa: "US",
    "united states": "US",
  };

  for (const key in countries) {
    if (text.includes(key)) {
      filter.country_id = countries[key];
    }
  }

  return filter;
}

function serializeProfile(p) {
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

export async function GET(req) {
  const versionError = requireApiVersion(req);
  if (versionError) return versionError;

  const { response } = await requireAuth(req);
  if (response) return response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return jsonResponse(
      { status: "error", message: "Missing query" },
      400
    );
  }

  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 50);
  const skip = (page - 1) * limit;

  const parsedFilter = parseQuery(q);

  const filter =
    Object.keys(parsedFilter).length > 0
      ? parsedFilter
      : {
          name: {
            $regex: q.trim(),
            $options: "i",
          },
        };

  const total = await Profile.countDocuments(filter);
  const total_pages = Math.ceil(total / limit);

  const profiles = await Profile.find(filter)
    .skip(skip)
    .limit(limit)
    .lean();

  const base = `/api/profiles/search?q=${encodeURIComponent(q)}`;

  return jsonResponse({
    status: "success",
    page,
    limit,
    total,
    total_pages,
    links: {
      self: `${base}&page=${page}&limit=${limit}`,
      next:
        page < total_pages
          ? `${base}&page=${page + 1}&limit=${limit}`
          : null,
      prev:
        page > 1
          ? `${base}&page=${page - 1}&limit=${limit}`
          : null,
    },
    data: profiles.map(serializeProfile),
  });
}
