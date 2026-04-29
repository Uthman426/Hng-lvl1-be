import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { jsonResponse } from "@/lib/response";
import { requireApiVersion, requireAuth, requireRole } from "@/lib/guards";

async function findProfile(id) {
  const query = [{ id }];

  if (mongoose.Types.ObjectId.isValid(id)) {
    query.push({ _id: id });
  }

  return Profile.findOne({ $or: query }).lean();
}

export async function GET(req, context) {
  const versionError = requireApiVersion(req);
  if (versionError) return versionError;

  const { response } = await requireAuth(req);
  if (response) return response;

  await connectDB();

  const { id } = await context.params;
  const profile = await findProfile(id);

  if (!profile) {
    return jsonResponse(
      { status: "error", message: "Profile not found" },
      404
    );
  }

  return jsonResponse({
    status: "success",
    data: {
      id: profile.id || String(profile._id),
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
  });
}

export async function DELETE(req, context) {
  const versionError = requireApiVersion(req);
  if (versionError) return versionError;

  const { user, response } = await requireAuth(req);
  if (response) return response;

  const roleError = requireRole(user, "admin");
  if (roleError) return roleError;

  await connectDB();

  const { id } = await context.params;
  const profile = await findProfile(id);

  if (!profile) {
    return jsonResponse(
      { status: "error", message: "Profile not found" },
      404
    );
  }

  await Profile.deleteOne({ _id: profile._id });

  return new Response(null, { status: 204 });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":
        process.env.WEB_URL || "http://localhost:3001",
      "Access-Control-Allow-Methods": "GET,DELETE,OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-API-Version",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
