import { connectDB } from "@/lib/mongodb";
import Session from "@/models/Session";
import { hashToken } from "@/lib/token";

export async function POST(req) {
  await connectDB();

  const { refresh_token } = await req.json();

  if (refresh_token) {
    await Session.deleteOne({
      refresh_token_hash: hashToken(refresh_token),
    });
  }

  return Response.json({
    status: "success",
    message: "Logged out",
  });
}
