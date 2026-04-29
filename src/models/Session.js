import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  refresh_token_hash: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Session ||
  mongoose.model("Session", SessionSchema);
