import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { jsonResponse } from "@/lib/response";

function parseQuery(q) {
  q = q.toLowerCase();
  let filter = {};

  // gender
  if (q.includes("male")) filter.gender = "male";
  if (q.includes("female")) filter.gender = "female";

  // age logic
  if (q.includes("young")) {
    filter.age = { $gte: 16, $lte: 24 };
  }

  const aboveMatch = q.match(/above (\d+)/);
  if (aboveMatch) {
    filter.age = { $gte: Number(aboveMatch[1]) };
  }

  // age group
  if (q.includes("adult")) filter.age_group = "adult";
  if (q.includes("teenager")) filter.age_group = "teenager";

  // countries (expand this!)
  const countries = {
    nigeria: "NG",
    kenya: "KE",
    angola: "AO",
  };

  for (let key in countries) {
    if (q.includes(key)) {
      filter.country_id = countries[key];
    }
  }

  if (Object.keys(filter).length === 0) {
    throw new Error("Unable to interpret query");
  }

  return filter;
}

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q) {
    return jsonResponse(
      { status: "error", message: "Missing query" },
      400
    );
  }

  let filter;
  try {
    filter = parseQuery(q);
  } catch {
    return jsonResponse(
      { status: "error", message: "Unable to interpret query" },
      400
    );
  }

  const page = Number(searchParams.get("page")) || 1;
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 50);
  const skip = (page - 1) * limit;

  const total = await Profile.countDocuments(filter);

  const data = await Profile.find(filter)
    .skip(skip)
    .limit(limit)
    .lean();

  return jsonResponse({
    status: "success",
    page,
    limit,
    total,
    data,
  });
}