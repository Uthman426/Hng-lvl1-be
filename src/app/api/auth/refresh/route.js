import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Session from "@/models/Session";
import { generateTokens, hashToken } from "@/lib/token";

export async function POST(req) {
  await connectDB();

  const { refresh_token } = await req.json();

  if (!refresh_token) {
    return Response.json(
      { status: "error", message: "Refresh token required" },
      { status: 400 }
    );
  }

  const session = await Session.findOne({
    refresh_token_hash: hashToken(refresh_token),
  });

  if (!session || session.expires_at < new Date()) {
    if (session) await Session.deleteOne({ _id: session._id });

    return Response.json(
      { status: "error", message: "Invalid refresh token" },
      { status: 401 }
    );
  }

  const user = await User.findOne({ id: session.user_id });

  if (!user || !user.is_active) {
    return Response.json(
      { status: "error", message: "Forbidden" },
      { status: 403 }
    );
  }

  await Session.deleteOne({ _id: session._id });

  const tokens = await generateTokens(user);

  return Response.json({
    status: "success",
    ...tokens,
  });
}
