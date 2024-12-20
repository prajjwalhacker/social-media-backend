const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true, // Removes whitespace from start and end
    minlength: 3,
  },
  userWelcomeModal: {
    type: Boolean,
    default: true
  },
  connectionRequests: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      accepted: Boolean
    }
  ],
  friends: [mongoose.Schema.Types.ObjectId],
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address'], // Basic regex for email validation
  },
  password: {
    type: String,
    required: true,
    minlength: 6, // Increase based on security requirements
  },
  profilePicture: {
    type: String,
    default: '', // URL to the profile picture, optional
  },
  bio: {
    type: String,
    maxlength: 150, // Optional short bio
  },
  token: {
    type: String
  },
  refreshToken: {
     type: String
  },
  followers: [mongoose.Schema.Types.ObjectId],
  following: [mongoose.Schema.Types.ObjectId,
  ],
  profileUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true }); // Adds createdAt and updatedAt fields

// Add indexing for fields frequently queried
userSchema.index({ username: 1, email: 1 });

// userSchema.pre('save', async function(next) {
//   if (this.isModified('password')) {
//     const bcrypt = require('bcryptjs');
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

const User = mongoose.model('User', userSchema);

module.exports = User;