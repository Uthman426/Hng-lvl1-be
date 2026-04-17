
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";

export async function GET(req, { params }) {
  await connectDB();

  const profile = await Profile.findById(params.id);

  if (!profile) {
    return Response.json(
      { status: "error", message: "Profile not found" },
      { status: 404 }
    );
  }

  return Response.json({
    status: "success",
    data: profile,
  });
}