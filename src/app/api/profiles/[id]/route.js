
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { jsonResponse } from "@/lib/response";

export async function GET(req, context) {
   await connectDB();

  const { id } = await context.params;

  const profile = await Profile.findById(id).lean();

  if (!profile) {
    return jsonResponse(
      { status: "error", message: "Profile not found" },
      404
    );
  }

  return jsonResponse({
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
  },);
}
export async function DELETE(req, context) {
   await connectDB();

  const { id } = await context.params;

  const profile = await Profile.findById(id).lean();

  if (!profile) {
    return jsonResponse(
      { status: "error", message: "Profile not found" },
      404
    );
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
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