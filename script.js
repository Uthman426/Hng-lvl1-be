import "dotenv/config";
import fs from "fs";
import { connectDB } from "./src/lib/mongodb.js";
import Profile from "./src/models/Profile.js";

const data = JSON.parse(fs.readFileSync("./seed_profiles.json"));

await connectDB();

for (let item of data) {
  await Profile.updateOne(
    { name: item.name },
    { $setOnInsert: item },
    { upsert: true }
  );
}

console.log("Seed complete");