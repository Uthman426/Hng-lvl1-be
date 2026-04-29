import { Parser } from "json2csv";
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { requireApiVersion, requireAuth } from "@/lib/guards";

export async function GET(req) {
  const versionError = requireApiVersion(req);
  if (versionError) return versionError;

  const { response } = await requireAuth(req);
  if (response) return response;

  await connectDB();

  const { searchParams } = new URL(req.url);

  if (searchParams.get("format") !== "csv") {
    return Response.json(
      { status: "error", message: "Unsupported export format" },
      { status: 400 }
    );
  }

  const filter = {};

  const gender = searchParams.get("gender");
  const country = searchParams.get("country") || searchParams.get("country_id");
  const ageGroup = searchParams.get("age_group") || searchParams.get("age-group");

  if (gender) filter.gender = gender.toLowerCase();
  if (country) filter.country_id = country.toUpperCase();
  if (ageGroup) filter.age_group = ageGroup.toLowerCase();

  const sortBy = searchParams.get("sort_by") || "created_at";
  const order = searchParams.get("order") === "asc" ? 1 : -1;

  const profiles = await Profile.find(filter)
    .sort({ [sortBy]: order })
    .lean();

  const fields = [
    "id",
    "name",
    "gender",
    "gender_probability",
    "age",
    "age_group",
    "country_id",
    "country_name",
    "country_probability",
    "created_at",
  ];

  const csv = new Parser({ fields }).parse(profiles);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="profiles_${timestamp}.csv"`,
    },
  });
}
