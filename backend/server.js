import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
import uploadRouter from "./routes/upload.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(
    `[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  next();
});
app.get("/api/ping", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);
app.use("/api/upload", uploadRouter);
const PORT = process.env.PORT || 5000;
// Connect to DB
connectDB();
// Start server

app.listen(PORT, () => console.log("Server running on port", PORT));
