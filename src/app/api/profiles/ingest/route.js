import { v7 as uuidv7 } from "uuid";
import { connectDB } from "@/lib/mongodb";
import Profile from "@/models/Profile";
import { requireApiVersion, requireAuth, requireRole } from "@/lib/guards";
import { clearCache } from "@/lib/cache";
import { getAgeGroup } from "@/lib/utils";

const BATCH_SIZE = 1000;
const VALID_GENDERS = new Set(["male", "female"]);

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }

  if (quoted) return null;

  cells.push(cell.trim());
  return cells;
}

async function* readLines(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) yield line;
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) yield buffer;
}

function normalizeHeader(header) {
  return header.map((h) => h.trim().toLowerCase());
}

function buildProfile(row, header) {
  const data = {};
  header.forEach((key, index) => {
    data[key] = row[index]?.trim();
  });

  const missing = ["name", "gender", "age", "country_id"].some((key) => !data[key]);
  if (missing) return { error: "missing_fields" };

  const gender = data.gender.toLowerCase();
  if (!VALID_GENDERS.has(gender)) return { error: "invalid_gender" };

  const age = Number(data.age);
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    return { error: "invalid_age" };
  }

  return {
    profile: {
      id: data.id || uuidv7(),
      name: data.name,
      gender,
      gender_probability: Number(data.gender_probability) || null,
      age,
      age_group: data.age_group?.toLowerCase() || getAgeGroup(age),
      country_id: data.country_id.toUpperCase(),
      country_name: data.country_name || data.country_id.toUpperCase(),
      country_probability: Number(data.country_probability) || null,
      created_at: data.created_at ? new Date(data.created_at) : new Date(),
    },
  };
}

async function flushBatch(batch, summary) {
  if (!batch.length) return;

  const names = batch.map((profile) => profile.name);
  const existing = await Profile.find({ name: { $in: names } })
    .select("name")
    .lean();

  const duplicates = new Set(existing.map((p) => p.name));
  const inserts = [];

  for (const profile of batch) {
    if (duplicates.has(profile.name)) {
      summary.skipped++;
      summary.reasons.duplicate_name = (summary.reasons.duplicate_name || 0) + 1;
    } else {
      inserts.push({ insertOne: { document: profile } });
    }
  }

  if (!inserts.length) return;

  try {
    const result = await Profile.bulkWrite(inserts, { ordered: false });
    summary.inserted += result.insertedCount || 0;
  } catch (err) {
    const duplicateErrors = err.writeErrors?.filter((e) => e.code === 11000) || [];
    const inserted = err.result?.insertedCount || 0;

    summary.inserted += inserted;
    summary.skipped += duplicateErrors.length;
    summary.reasons.duplicate_name =
      (summary.reasons.duplicate_name || 0) + duplicateErrors.length;

    const otherErrors = (err.writeErrors?.length || 0) - duplicateErrors.length;
    if (otherErrors > 0) {
      summary.skipped += otherErrors;
      summary.reasons.write_error = (summary.reasons.write_error || 0) + otherErrors;
    }
  }
}

export async function POST(req) {
  const versionError = requireApiVersion(req);
  if (versionError) return versionError;

  const { user, response } = await requireAuth(req);
  if (response) return response;

  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  if (!req.body) {
    return Response.json(
      { status: "error", message: "CSV body required" },
      { status: 400 }
    );
  }

  await connectDB();

  const summary = {
    status: "success",
    total_rows: 0,
    inserted: 0,
    skipped: 0,
    reasons: {},
  };

  let header = null;
  let batch = [];

  try {
    for await (const line of readLines(req.body)) {
      const cells = splitCsvLine(line);

      if (!cells) {
        summary.total_rows++;
        summary.skipped++;
        summary.reasons.malformed_row = (summary.reasons.malformed_row || 0) + 1;
        continue;
      }

      if (!header) {
        header = normalizeHeader(cells);
        continue;
      }

      summary.total_rows++;

      if (cells.length !== header.length) {
        summary.skipped++;
        summary.reasons.malformed_row = (summary.reasons.malformed_row || 0) + 1;
        continue;
      }

      const built = buildProfile(cells, header);

      if (built.error) {
        summary.skipped++;
        summary.reasons[built.error] = (summary.reasons[built.error] || 0) + 1;
        continue;
      }

      batch.push(built.profile);

      if (batch.length >= BATCH_SIZE) {
        await flushBatch(batch, summary);
        batch = [];
      }
    }

    await flushBatch(batch, summary);
    clearCache();

    return Response.json(summary);
  } catch {
    summary.status = "partial_success";
    summary.reasons.processing_error = (summary.reasons.processing_error || 0) + 1;
    return Response.json(summary, { status: 207 });
  }
}
