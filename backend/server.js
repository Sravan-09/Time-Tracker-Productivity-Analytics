const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/productivityTracker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema allows flexible 'data' object to store various domain keys
const trackingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  data: { type: Object, default: {} }
}, { strict: false });

const UserTracking = mongoose.model('UserTracking', trackingSchema);

/**
 * POST /api/track
 * Receives domain usage data and increments existing totals in the database
 */
app.post('/api/track', async (req, res) => {
  try {
    const { userId, data } = req.body;
    
    if (!userId || !data) {
      return res.status(400).json({ error: 'Missing userId or data' });
    }

    // MongoDB keys cannot contain dots; swap '.' with '_' for storage
    const updateQuery = {};
    for (const [domain, time] of Object.entries(data)) {
      const safeDomain = domain.replace(/\./g, '_');
      updateQuery[`data.${safeDomain}`] = time;
    }

    // Atomically increment the time values for this user
    const updatedUser = await UserTracking.findOneAndUpdate(
      { userId: userId },
      { $inc: updateQuery },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/report/:userId
 * Aggregates raw domain data into Productive, Unproductive, and Neutral categories
 */
app.get('/api/report/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserTracking.findOne({ userId });
    
    if (!user || !user.data) {
      return res.json({ productive: 0, unproductive: 0, neutral: 0, details: {} });
    }

    let productive = 0;
    let unproductive = 0;
    let neutral = 0;
    const details = {};
    
    for (const [safeDomain, time] of Object.entries(user.data)) {
      if (typeof time !== 'number') continue;

      // Revert underscores to dots for the frontend display
      const domain = safeDomain.replace(/_/g, '.');
      details[domain] = time;

      // Categorization Logic
      if (domain.includes('github') || domain.includes('stackoverflow') || domain.includes('localhost')) {
        productive += time;
      } else if (domain.includes('youtube') || domain.includes('facebook') || domain.includes('reddit') || domain.includes('instagram')) {
        unproductive += time;
      } else {
        neutral += time;
      }
    }

    res.json({ productive, unproductive, neutral, details });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});