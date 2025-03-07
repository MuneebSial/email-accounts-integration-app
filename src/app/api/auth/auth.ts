import express from "express";
import passport from "./microsoft/microsoft";

const router = express.Router();

// Route to start authentication
router.get("/microsoft", passport.authenticate("microsoft"));

// Callback route after Microsoft authentication
router.get("/microsoft/callback",
  passport.authenticate("microsoft", { failureRedirect: "/" }),
  (req, res) => {
    res.json({ message: "Microsoft authentication successful", user: req.user });
  }
);

export default router;
