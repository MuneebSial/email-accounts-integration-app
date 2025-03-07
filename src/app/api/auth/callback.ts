import { NextApiRequest, NextApiResponse } from "next";
import passport from "@/lib/passport"; 
import nextConnect from "next-connect"; 

const handler = nextConnect<NextApiRequest, NextApiResponse>();

handler.use(passport.initialize());

handler.get(passport.authenticate("microsoft", { session: false }), 
  (req: NextApiRequest, res: NextApiResponse) => {
    res.redirect("/dashboard"); 
  }
);

export default handler;
