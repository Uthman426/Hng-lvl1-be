import { v7 as uuidv7 } from "uuid";
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { jsonResponse } from "@/lib/response";
import { requireApiVersion, requireAuth, requireRole } from "@/lib/guards";
import { fetchExternalData } from "@/lib/external";
import { getAgeGroup } from "@/lib/utils";
import { getCache, setCache, clearCache } from "@/lib/cache";
import {
  PROFILE_PROJECTION,
  parseListFilters,
  serializeProfile,
  stableCacheKey,
} from "@/lib/query";

const ALLOWED_SORT_FIELDS = new Set([
  "age",
  "created_at",
  "gender_probability",
  "country_probability",
]);

function parsePagination(searchParams) {
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 50);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function parseSort(searchParams) {
  const requestedSort = searchParams.get("sort_by") || "created_at";
  const sortBy = ALLOWED_SORT_FIELDS.has(requestedSort)
    ? requestedSort
    : "created_at";

  const order = searchParams.get("order") === "asc" ? 1 : -1;

  return { sortBy, order };
}

export async function GET(req) {
  const versionError = requireApiVersion(req);
  if (versionError) return versionError;

  const { response } = await requireAuth(req);
  if (response) return response;

  await connectDB();

  const { searchParams } = new URL(req.url);

  const filter = parseListFilters(searchParams);
  const { page, limit, skip } = parsePagination(searchParams);
  const { sortBy, order } = parseSort(searchParams);

  const cacheKey = stableCacheKey("profiles:list:v1", {
    filter,
    page,
    limit,
    sortBy,
    order,
  });

  const cached = getCache(cacheKey);
  if (cached) {
    return jsonResponse({
      ...cached,
      cache: "hit",
    });
  }

  const [total, profiles] = await Promise.all([
    Profile.countDocuments(filter),
    Profile.find(filter)
      .select(PROFILE_PROJECTION)
      .sort({ [sortBy]: order, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const total_pages = Math.ceil(total / limit);

  const base = "/api/profiles";
  const body = {
    status: "success",
    page,
    limit,
    total,
    total_pages,
    links: {
      self: `${base}?page=${page}&limit=${limit}`,
      next:
        page < total_pages
          ? `${base}?page=${page + 1}&limit=${limit}`
          : null,
      prev:
        page > 1
          ? `${base}?page=${page - 1}&limit=${limit}`
          : null,
    },
    data: profiles.map(serializeProfile),
  };

  setCache(cacheKey, body, {
    ttlMs: 60_000,
    maxEntries: 500,
  });

  return jsonResponse({
    ...body,
    cache: "miss",
  });
}

export async function POST(req) {
  const versionError = requireApiVersion(req);
  if (versionError) return versionError;

  const { user, response } = await requireAuth(req);
  if (response) return response;

  const roleError = requireRole(user, "admin");
  if (roleError) return roleError;

  await connectDB();

  const body = await req.json();
  const name = body.name?.trim();

  if (!name) {
    return jsonResponse(
      { status: "error", message: "Name is required" },
      400
    );
  }

  const exists = await Profile.findOne({ name }).select("_id").lean();

  if (exists) {
    return jsonResponse(
      { status: "error", message: "Profile already exists" },
      409
    );
  }

  const { gender, age, nation } = await fetchExternalData(name);

  const country = nation.country[0];

  const profile = await Profile.create({
    id: uuidv7(),
    name,
    gender: gender.gender,
    gender_probability: gender.probability,
    age: age.age,
    age_group: getAgeGroup(age.age),
    country_id: country.country_id,
    country_name: country.country_id,
    country_probability: country.probability,
    created_at: new Date(),
  });

  clearCache();

  return jsonResponse(
    {
      status: "success",
      data: serializeProfile(profile),
    },
    201
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":
        process.env.WEB_URL,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-API-Version",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
