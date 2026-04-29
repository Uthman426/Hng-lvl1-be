// import { generatePKCE } from "@/lib/pkce";

// export async function GET() {
//   const { code_verifier, code_challenge } = generatePKCE();

//   const state = crypto.randomBytes(16).toString("hex");

//   const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user&state=${state}&code_challenge=${code_challenge}&code_challenge_method=S256`;

//   return Response.redirect(url);
// }

import { generatePKCE } from "@/lib/pkce";

export async function GET(req) {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const baseUrl = process.env.BASE_URL;

  if (!githubClientId || !baseUrl) {
    return Response.json(
      {
        status: "error",
        message: "Missing GITHUB_CLIENT_ID or BASE_URL environment variable",
      },
      { status: 500 }
    );
  }

  const { code_verifier, code_challenge } = generatePKCE();
  const state = crypto.randomUUID();

  const { searchParams } = new URL(req.url);
  const isCli = searchParams.get("cli") === "true";

  const redirect_uri = isCli
    ? "http://localhost:4000/callback"
    : `${baseUrl}/api/auth/github/callback`;

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${githubClientId}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=user:email` +
    `&state=${state}` +
    `&code_challenge=${code_challenge}` +
    `&code_challenge_method=S256`;

  if (isCli) {
    return Response.redirect(`${url}&verifier=${code_verifier}&cli=true`);
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": `pkce_verifier=${code_verifier}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
      Location: url,
    },
  });
}
