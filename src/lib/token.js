import crypto from "crypto";
import jwt from "jsonwebtoken";
import Session from "@/models/Session";

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generateTokens(user) {
  const access_token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3m" }
  );

  const refresh_token = crypto.randomBytes(48).toString("base64url");

  await Session.create({
    user_id: user.id,
    refresh_token_hash: hashToken(refresh_token),
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
  });

  return { access_token, refresh_token };
}
