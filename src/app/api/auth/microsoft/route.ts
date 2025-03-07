import express from "express";
import passport from "./microsoft"; "@/lib/passport";


const router = express.Router();

router.get(
  "/",
  passport.authenticate("microsoft", { scope: ["user.read"] })
);

router.get(
  "/callback",
  passport.authenticate("microsoft", {
    failureRedirect: "/login",
    session: false,
  }),
  (req, res) => {
    res.json({ user: req.user });
  }
);

export default router;
