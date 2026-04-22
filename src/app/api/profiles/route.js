// app/api/profiles/route.js
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { fetchExternalData } from "@/lib/external";
import { getAgeGroup } from "@/lib/utils";
import { jsonResponse } from "@/lib/response";
import { v7 as uuidv7 } from "uuid";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body.name || typeof body.name !== "string") {
      return Response.json(
        { status: "error", message: "Missing or invalid name" },
        { status: 400 }
      );
    }

    const name = body.name.toLowerCase();

    // Check duplicate
    const existing = await Profile.findOne({ name });
    if (existing) {
    //   return Response.json({
    //     status: "success",
    //     message: "Profile already exists",
    //     data: existing,
    //   });
    return jsonResponse({
  status: "success",
  message: "Profile already exists",
  data: {
    id: existing.id,
    name: existing.name,
    gender: existing.gender,
    gender_probability: existing.gender_probability,
    sample_size: existing.sample_size,
    age: existing.age,
    age_group: existing.age_group,
    country_id: existing.country_id,
    country_name: existing.country_name,
    country_probability: existing.country_probability,
    created_at: existing.created_at,
  },
});
    }

    let data;
    try {
      data = await fetchExternalData(name);
    } catch (err) {
      return jsonResponse(
        {
          status: "error",
          message: `${err.message} returned an invalid response`,
        },
        { status: 502 }
      );
    }

    const { gender, age, nation } = data;

    // pick highest probability country
    const topCountry = nation.country.reduce((prev, curr) =>
      curr.probability > prev.probability ? curr : prev
    );

    const profile = await Profile.create({
  id: uuidv7(), 
  name,
  gender: gender.gender,
  gender_probability: gender.probability,
  sample_size: gender.count,
  age: age.age,
  age_group: getAgeGroup(age.age),
  country_id: topCountry.country_id,
  country_name: topCountry.name || "Unknown",
  country_probability: topCountry.probability,
});

    return jsonResponse(
  {
    status: "success",
    data: {
      id: profile.id,
      name: profile.name,
      gender: profile.gender,
      gender_probability: profile.gender_probability,
      sample_size: profile.sample_size,
      age: profile.age,
      age_group: profile.age_group,
      country_id: profile.country_id,
      country_name: profile.country_name,
      country_probability: profile.country_probability,
      created_at: profile.created_at,
    },
  },
  201
);
  } catch (err) {
    return Response.json(
      { status: "error", message: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);

  let filter = {};

  // ===== FILTERS =====
  const gender = searchParams.get("gender");
  const age_group = searchParams.get("age_group");
  const country_id = searchParams.get("country_id");

  if (gender) filter.gender = gender.toLowerCase();
  if (age_group) filter.age_group = age_group.toLowerCase();
  if (country_id) filter.country_id = country_id.toUpperCase();
  

  // Range filters
  const min_age = searchParams.get("min_age");
  const max_age = searchParams.get("max_age");

  if (min_age || max_age) {
    filter.age = {};
    if (min_age) filter.age.$gte = Number(min_age);
    if (max_age) filter.age.$lte = Number(max_age);
  }
  if (
  (min_age && isNaN(min_age)) ||
  (max_age && isNaN(max_age)) ||
  (min_gender_prob && isNaN(min_gender_prob)) ||
  (min_country_prob && isNaN(min_country_prob))
) {
  return jsonResponse(
    { status: "error", message: "Invalid query parameters" },
    422
  );
}

  const min_gender_prob = searchParams.get("min_gender_probability");
  if (min_gender_prob) {
    filter.gender_probability = { $gte: Number(min_gender_prob) };
  }

  const min_country_prob = searchParams.get("min_country_probability");
  if (min_country_prob) {
    filter.country_probability = { $gte: Number(min_country_prob) };
  }

  // ===== SORTING =====
  const sort_by = searchParams.get("sort_by") || "created_at";
  const order = searchParams.get("order") === "asc" ? 1 : -1;

  const allowedSort = ["age", "created_at", "gender_probability"];
  if (!allowedSort.includes(sort_by)) {
    return jsonResponse(
      { status: "error", message: "Invalid query parameters" },
      422
    );
  }
  if (order !== 1 && order !== -1) {
  return jsonResponse(
    { status: "error", message: "Invalid query parameters" },
    422
  );
}

  const sort = {};
  sort[sort_by] = order;

  // ===== PAGINATION =====
  const page = Number(searchParams.get("page")) || 1;
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
  const skip = (page - 1) * limit;

  // ===== QUERY =====
  const total = await Profile.countDocuments(filter);

  const profiles = await Profile.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return jsonResponse({
    status: "success",
    page,
    limit,
    total,
    data: profiles.map(p => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      gender_probability: p.gender_probability,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
      country_name: p.country_name,
      country_probability: p.country_probability,
      created_at: p.created_at,
    })),
  });
}
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}