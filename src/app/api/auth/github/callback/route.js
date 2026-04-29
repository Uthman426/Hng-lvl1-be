import axios from "axios";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { generateTokens } from "@/lib/token";
import { v7 as uuidv7 } from "uuid";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);

  const code = searchParams.get("code");
  const cli = searchParams.get("cli");

  let code_verifier;

  if (cli === "true") {
    code_verifier = searchParams.get("verifier");
  } else {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/pkce_verifier=([^;]+)/);
    code_verifier = match?.[1];
  }

  if (!code) {
    return Response.json(
      { status: "error", message: "Missing OAuth code" },
      { status: 400 }
    );
  }

  if (!code_verifier) {
    return Response.json(
      { status: "error", message: "Missing PKCE verifier" },
      { status: 400 }
    );
  }

  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier,
    },
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  const githubToken = tokenRes.data.access_token;

  if (!githubToken) {
    return Response.json(
      { status: "error", message: "GitHub authentication failed" },
      { status: 401 }
    );
  }

  const userRes = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${githubToken}`,
    },
  });

  const gh = userRes.data;

  let user = await User.findOne({ github_id: String(gh.id) });

  if (!user) {
    user = await User.create({
      id: uuidv7(),
      github_id: String(gh.id),
      username: gh.login,
      email: gh.email,
      avatar_url: gh.avatar_url,
      role: "analyst",
      is_active: true,
    });
  }

  user.username = gh.login;
  user.avatar_url = gh.avatar_url;
  user.last_login_at = new Date();
  await user.save();

  const { access_token, refresh_token } = await generateTokens(user);

  if (cli === "true") {
    return Response.json({
      status: "success",
      access_token,
      refresh_token,
      username: user.username,
      role: user.role,
    });
  }

  const webUrl = process.env.WEB_URL ;

  const response = NextResponse.redirect(`${webUrl}/dashboard`);

  response.cookies.set("access_token", access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 3,
  });

  response.cookies.set("refresh_token", refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 5,
  });

  response.cookies.delete("pkce_verifier");

  return response;
}
