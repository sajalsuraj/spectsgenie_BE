const express = require('express');
const passport = require('passport');
const session = require('express-session');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
require('dotenv').config();

const app = express();

// Mock database functions
const db = {
  users: [], // In-memory users array

  async findOrCreateUser(googleId, userData) {
    // Check if user exists
    let user = this.users.find((u) => u.googleId === googleId);
    if (!user) {
      // If not, create a new user
      user = { id: this.users.length + 1, googleId, ...userData };
      this.users.push(user);
    }
    return user;
  },
};

// Configure session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport with Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user in the database
        const user = await db.findOrCreateUser(profile.id, {
          name: profile.displayName,
          email: profile.emails[0]?.value,
          photo: profile.photos[0]?.value,
        });
        return done(null, user);
      } catch (err) {
        console.error('Error finding or creating user:', err);
        return done(err);
      }
    }
  )
);

// Serialize user data into the session
passport.serializeUser((user, done) => {
  done(null, user.id); // Save user ID in session
});

// Deserialize user data from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = db.users.find((u) => u.id === id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Routes
app.get('/', (req, res) => {
  res.send('<a href="/auth/google">Sign in with Google</a>');
});

// Trigger Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Handle Google OAuth callback
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful login
    res.send(`Welcome, ${req.user.name}! <a href="/logout">Logout</a>`);
  }
);

// Logout route
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout error' });
    res.redirect('/');
  });
});