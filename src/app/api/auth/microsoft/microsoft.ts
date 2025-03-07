import passport from "passport";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import dotenv from "dotenv";

dotenv.config();

interface MicrosoftProfile {
  id: string;
  displayName?: string;
  emails?: { value: string }[];
}

type VerifyCallback = (error: any, user?: any) => void;

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      callbackURL: process.env.MICROSOFT_CALLBACK_URL || "",
      scope: ["user.read"], 
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: MicrosoftProfile,
      done: VerifyCallback     
    ) => {
      try {
        const user = {
          id: profile.id,
          name: profile.displayName || "Unknown User",
          email: profile.emails?.[0]?.value || "no-email@example.com", 
        };
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user as any);
});

export default passport;
