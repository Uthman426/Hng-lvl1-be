
import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true },

  gender: String,
  gender_probability: Number,
  sample_size: Number,

  age: Number,
  age_group: String,

  country_id: String,
  country_probability: Number,

  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Profile ||
  mongoose.model("Profile", ProfileSchema);