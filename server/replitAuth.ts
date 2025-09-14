// Replit Auth integration for multi-campaign platform
// Based on blueprint: javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Create session store with PostgreSQL primary and memory fallback
  let sessionStore;
  
  try {
    if (process.env.DATABASE_URL) {
      const pgStore = connectPg(session);
      sessionStore = new pgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true, // Allow table creation for reliability
        ttl: sessionTtl / 1000, // TTL in seconds for PostgreSQL store
        tableName: "sessions",
        errorLog: (error: Error) => {
          console.error('PostgreSQL session store error:', error);
        }
      });
      console.log('Using PostgreSQL session store');
    } else {
      throw new Error('DATABASE_URL not available');
    }
  } catch (error) {
    console.warn('PostgreSQL session store failed, falling back to memory store:', error);
    // Fallback to memory store with TTL
    const memStore = MemoryStore(session);
    sessionStore = new memStore({
      checkPeriod: sessionTtl, // Cleanup interval
      ttl: sessionTtl, // TTL in milliseconds for memory store
    });
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'replit.sid', // Use consistent session name
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only secure in production (HTTPS)
      sameSite: 'lax', // CSRF protection while allowing normal navigation
      maxAge: sessionTtl,
      // Add additional security in production
      ...(isProduction && {
        domain: process.env.REPLIT_DOMAINS?.split(',')[0], // Use primary domain
      }),
    },
    // Additional security configuration
    rolling: true, // Reset session expiry on activity
    proxy: true, // Trust proxy headers
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    // Register strategies for all configured domains
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    for (const domain of domains) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      console.log(`Registered auth strategy for domain: ${domain}`);
    }

    // In development, also register localhost strategy using the primary domain's callback
    if (process.env.NODE_ENV === 'development') {
      const primaryDomain = domains[0];
      const localhostStrategy = new Strategy(
        {
          name: `replitauth:localhost`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${primaryDomain}/api/callback`, // Use primary domain for callback
        },
        verify,
      );
      passport.use(localhostStrategy);
      console.log(`Registered localhost auth strategy using primary domain callback: ${primaryDomain}`);
    }

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));
    
    console.log('Auth setup completed successfully');
  } catch (error) {
    console.error('Failed to setup auth:', error);
    throw error;
  }

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    req.logout(async () => {
      try {
        const config = await getOidcConfig();
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } catch (error) {
        console.error('Logout error:', error);
        res.redirect('/');
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};