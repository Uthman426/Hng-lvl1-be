// app/api/profiles/route.js
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { fetchExternalData } from "@/lib/external";
import { getAgeGroup } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

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
      return Response.json({
        status: "success",
        message: "Profile already exists",
        data: existing,
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
      id: uuidv4(),
      name,
      gender: gender.gender,
      gender_probability: gender.probability,
      sample_size: gender.count,
      age: age.age,
      age_group: getAgeGroup(age.age),
      country_id: topCountry.country_id,
      country_probability: topCountry.probability,
    });

    return Response.json(
      { status: "success", data: profile },
      { status: 201 }
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

  const profiles = await Profile.find(filter);

  return Response.json({
    status: "success",
    count: profiles.length,
    data: profiles.map(p => ({
      id: p._id,
      name: p.name,
      gender: p.gender,
      age: p.age,
      age_group: p.age_group,
      country_id: p.country_id,
    })),
  });
}
export async function DELETE(req, { params }) {
  await connectDB();

  const deleted = await Profile.findByIdAndDelete(params.id);

  if (!deleted) {
    return Response.json(
      { status: "error", message: "Profile not found" },
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
}