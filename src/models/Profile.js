import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true }, // ✅ UUID v7

  name: { type: String, required: true, unique: true },

  gender: String,
  gender_probability: Number,

  age: Number,
  age_group: String,

  country_id: String,
  country_name: String,
  country_probability: Number,

  created_at: {
    type: Date,
    default: Date.now,
  },
});


ProfileSchema.index({ gender: 1, age: 1, country_id: 1 });

export default mongoose.models.Profile ||
  mongoose.model("Profile", ProfileSchema);