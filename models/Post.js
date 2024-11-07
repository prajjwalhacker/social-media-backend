const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  message: {
    type: String,
  },
  userId: mongoose.Types.ObjectId,
  likes: [mongoose.Types.ObjectId],
  comments: [{ message: String, userId: mongoose.Types.ObjectId  }]
}, { timestamps: true }); // Adds createdAt and updatedAt fields


// userSchema.pre('save', async function(next) {
//   if (this.isModified('password')) {
//     const bcrypt = require('bcryptjs');
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;