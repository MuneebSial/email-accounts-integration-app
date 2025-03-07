import express from "express";
import emailRoutes from "./accounts/emails"; 
import authRoutes from "./auth/auth";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/emails", emailRoutes); 

export default router;
