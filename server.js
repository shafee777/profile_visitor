require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const useragent = require("useragent");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 📌 MongoDB Connection
mongoose.connect("mongodb://localhost:27017/profileViews", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 📌 Visitor Schema
const visitorSchema = new mongoose.Schema({
  ip: String,
  location: String,
  browser: String,
  device: String,
  os: String,
  viewedAt: { type: Date, default: Date.now },
});

const Visitor = mongoose.model("Visitor", visitorSchema);

// 📌 Capture Profile Views
app.post("/view-profile", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress; // Get IP Address
    const agent = useragent.parse(req.headers["user-agent"]); // Get Device Info

    // 📍 Get location from IP
    let location = "Unknown";
    try {
      const response = await axios.get(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`);
      location = `${response.data.city}, ${response.data.country}`;
    } catch (error) {
      console.log("Location fetch failed:", error.message);
    }

    // 📌 Save to DB
    const visitor = new Visitor({
      ip,
      location,
      browser: agent.family,
      device: agent.device.family,
      os: agent.os.family,
    });

    await visitor.save();
    res.json({ message: "Profile viewed successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error logging visitor" });
  }
});

// 📌 Get Profile Visitors
app.get("/profile-viewers", async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ viewedAt: -1 });
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: "Error fetching visitors" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
