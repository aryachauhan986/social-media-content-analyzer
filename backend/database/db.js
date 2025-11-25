import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO, {});
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
};

export default connectDB;
