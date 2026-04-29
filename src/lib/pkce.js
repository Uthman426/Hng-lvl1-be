import crypto from "crypto";

export function generatePKCE() {
  const code_verifier = crypto.randomBytes(32).toString("base64url");

  const code_challenge = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64url");

  return { code_verifier, code_challenge };
}