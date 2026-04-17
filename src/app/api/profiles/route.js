// app/api/profiles/route.js
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { fetchExternalData } from "@/lib/external";
import { getAgeGroup } from "@/lib/utils";
import { jsonResponse } from "@/lib/response";

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
    id: existing._id.toString(),
    name: existing.name,
    gender: existing.gender,
    gender_probability: existing.gender_probability,
    sample_size: existing.sample_size,
    age: existing.age,
    age_group: existing.age_group,
    country_id: existing.country_id,
    country_probability: existing.country_probability,
    created_at: existing.created_at,
  },
});
    }

    let data;
    try {
      data = await fetchExternalData(name);
    } catch (err) {
      return Response.json(
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
      name,
      gender: gender.gender,
      gender_probability: gender.probability,
      sample_size: gender.count,
      age: age.age,
      age_group: getAgeGroup(age.age),
      country_id: topCountry.country_id,
      country_probability: topCountry.probability,
    });

    return jsonResponse(
  {
    status: "success",
    data: {
      id: profile._id.toString(),
      name: profile.name,
      gender: profile.gender,
      gender_probability: profile.gender_probability,
      sample_size: profile.sample_size,
      age: profile.age,
      age_group: profile.age_group,
      country_id: profile.country_id,
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

  const gender = searchParams.get("gender");
  const country_id = searchParams.get("country_id");
  const age_group = searchParams.get("age_group");

  let filter = {};

  if (gender) filter.gender = new RegExp(`^${gender}$`, "i");
  if (country_id) filter.country_id = new RegExp(`^${country_id}$`, "i");
  if (age_group) filter.age_group = new RegExp(`^${age_group}$`, "i");

  const profiles = await Profile.find(filter).lean();

//   return Response.json({
//     status: "success",
//     count: profiles.length,
//     data: profiles.map(p => ({
//       id: p._id,
//       name: p.name,
//       gender: p.gender,
//       age: p.age,
//       age_group: p.age_group,
//       country_id: p.country_id,
//     })),
//   });
return jsonResponse({
    status: "success",
    count: profiles.length,
    data: profiles.map(p => ({
      id: p._id.toString(), // ✅ FIX
      name: p.name,
      gender: p.gender,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
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