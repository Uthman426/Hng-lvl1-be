import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  id: String, // UUID v7
  github_id: { type: String, unique: true },
  username: String,
  email: String,
  avatar_url: String,
  role: { type: String, default: "analyst" },
  is_active: { type: Boolean, default: true },
  last_login_at: Date,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", UserSchema);