// import { generatePKCE } from "@/lib/pkce";

// export async function GET() {
//   const { code_verifier, code_challenge } = generatePKCE();

//   const state = crypto.randomBytes(16).toString("hex");

//   const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user&state=${state}&code_challenge=${code_challenge}&code_challenge_method=S256`;

//   return Response.redirect(url);
// }

import { generatePKCE } from "@/lib/pkce";

export async function GET(req) {
  const { code_verifier, code_challenge } = generatePKCE();

  const state = crypto.randomUUID();

  const { searchParams } = new URL(req.url);
  const cli = searchParams.get("cli");

  const redirect_uri = cli
    ? "http://localhost:4000/callback"
    : `${process.env.BASE_URL}/api/auth/github/callback`;

  const url =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&scope=user` +
    `&state=${state}` +
    `&code_challenge=${code_challenge}` +
    `&code_challenge_method=S256`;

  // 🔥 STORE VERIFIER
  if (cli === "true") {
    // CLI → attach in redirect (safe for localhost)
    return Response.redirect(
      `${url}&verifier=${code_verifier}&cli=true`
    );
  }

  // WEB → store in cookie
  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": `pkce_verifier=${code_verifier}; HttpOnly; Path=/; Max-Age=600`,
      Location: url
    }
  });
}