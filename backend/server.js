import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use("/",(req,res)=>{
  res.send("Hello");
});
const PORT = process.env.PORT || 5000;
// Connect to DB
connectDB();
// Start server

app.listen(PORT, () => console.log("Server running on port", PORT));
