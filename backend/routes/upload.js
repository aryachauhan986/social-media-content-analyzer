import express from "express";
import upload from "../database/multer.js";
import { handleUpload } from "../controllers/uploadController.js";
const router = express.Router();
router.post("/", upload.single("file"), handleUpload);
export default router;
