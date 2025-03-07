import passport from "passport";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID || "",
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
      callbackURL: process.env.MICROSOFT_CALLBACK_URL || "",
      scope: ["user.read", "mail.read", "mail.send"], 
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: passport.Profile,
      done: (error: any, user?: Express.User | false) => void
    ) => {
      try {
        const user = {
          id: profile.id,
          name: profile.displayName || "Unknown User",
          email: profile.emails?.[0]?.value || "no-email@example.com",
          accessToken,
          refreshToken,
        };
        return done(null, user);
      } catch (error) {
        return done(error, false); 
      }
    }
  )
);

passport.serializeUser((user: Express.User, done: (error: any, id?: any) => void) => {
  done(null, user);
});

passport.deserializeUser((user: Express.User, done: (error: any, user?: Express.User | false) => void) => {
  done(null, user);
});

export default passport;
