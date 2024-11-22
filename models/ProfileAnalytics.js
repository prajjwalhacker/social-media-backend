const mongoose = require('mongoose');

const profileAnalyticsSchema = new mongoose.Schema({
  totalVisits: Number,
  userId: mongoose.Types.ObjectId,
  peopleVisted: [{ peopleId: mongoose.Schema.Types.ObjectId, visitedAt: Date }],
  creationDate: Date
}, { timestamps: true });


const ProfileAnalytics = mongoose.model('ProfileAnalytics', profileAnalyticsSchema);

module.exports = ProfileAnalytics;