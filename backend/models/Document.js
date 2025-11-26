import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Document", DocumentSchema);
