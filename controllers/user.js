const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
const config = require('../config.json');
const Post = require('../models/Post');
const mongoose = require('mongoose');

dotenv.config();


const createToken = (userId, expiresIn) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: expiresIn,
  });
};


const signup = async (req, res) => {
  try {
    console.log("helloooo");
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Create a new user
    const newUser = new User({ username, email, password });

    const token = createToken(newUser._id, config.JWT_EXPIRES_IN);
    const refreshToken = createToken(newUser._id, config.REFRESH_EXPIRES_IN);

    newUser.token = token;
    newUser.refreshToken = refreshToken;

    await newUser.save();


    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' })
    .header('Authorization', token)
    .send(newUser);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error during signup', error });
  }
};

// Login Function
const login = async (req, res) => {
  console.log("helllooooooo !!");
  try {
    const { email, password } = req.body;

    console.log("email and password");
    console.log(email);
    console.log(password);

    // Find the user by email
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(400).json({ message: 'User not found' });

    console.log("userrrr");
    console.log(user);

    // Generate a JWT
    const token = createToken(user._id, config.JWT_EXPIRES_IN);
    const refreshToken = createToken(user._id, config.REFRESH_EXPIRES_IN);

    const newUser = await User.findOneAndUpdate({ email }, {
       $set: {
          token: token,
          refreshToken: refreshToken
       }
    })


    res
      .status(200).cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' })
      .header('Authorization', token)
      .json({ message: 'Login successful', newUser });
  } catch (error) {
    console.log(error, "error")
    res.status(500).json({ message: 'Error during login', error });
  }
};

const postCreation = async (req, res) => {
    try {
      const { userId, post, updateType, postId } = req.body;
      if (!userId) {
        return res.status(401).send('Please provide userId to create post');
      }
      if (!post) {
        return res.status(401).send('post message is required');
      }
      const newPost = new Post({ userId: new mongoose.Types.ObjectId(userId), message: post });
      await newPost.save();
      res.json({ post: newPost });
    }
    catch (err) {
      console.log(err);
      res.status(500).json({ message: 'Error during post creation', err });    
    }
}

const postDeletion = async (req, res)=>{
   try {
      const { userId, postId } = req.body;
       if (!userId) {
         return res.status(401).json({ message: "userId is required" });
       }
       await Post.deleteOne({ userId: new mongoose.Types.ObjectId(userId), _id: new mongoose.Types.ObjectId(postId) });
       res.json({ success: true, msg: "Post deleted successfully" });
   }
   catch (err) {
      res.status(500).json({ message: "Error during post deletion" });
   }
}

const logout = (req, res) => {
  res
    .cookie('token', '', { httpOnly: true, expires: new Date(0) })
    .status(200)
    .json({ message: 'Logout successful' });
};

const genenrateToken = async (req, res) => {
   const refreshToken = req.cookies['refreshToken'];
   if (!refreshToken) {
    return res.status(401).send('Access Denied. No refresh token provided.');
  }
  const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
  const userObj = await User.findOne({ _id: decoded.user });
  if (userObj.refreshToken !== refreshToken) {
     return res.status(401).send('Invalid refresh token');
  }
  const accessToken = jwt.sign({ user: decoded.user }, secretKey, { expiresIn: '1h' });
  await User.findOneAndUpdate({ _id: decoded.user }, {
    $set: {
       accessToken: accessToken
    }
  })

  res
  .header('Authorization', accessToken)
  .send(decoded.user);
}

const authenticate = async (req, res, next) => {
   let accessToken = req.header['Authorization'];
   const refreshToken = req.cookies['refreshToken'];
   if (!refreshToken) {
      res.status(401).send('Access denied no token provided');
   };
   if (!accessToken) {
      const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
      if (!decoded.id) {
        res.status(401).send("Trying to access resource corruptly");
      }
      accessToken = jwt.sign({ user: decoded.user }, config.JWT_SECRET, { expiresIn: '1h' });
      await User.findOneAndUpdate({ _id: decoded.id }, {
        $set: {
           token: accessToken 
        }
      })
   }


   jwt.verify(accessToken, config.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user;
    next();
   });
}

const getPosts = async (req, res) => {
  try {
    const { userId } = req.body;
   if (!userId) {
      res.status(401).send('UserId is required');
   }
   const postList = await Post.find({ userId: mongoose.Types.ObjectId(userId) }).lean();

   res.json({ list: postList });
  }
  catch (err) {
      console.log(err);
      res.status(501).send('Something went wrong');
  }
   
}

const acceptConnection = async (req, res) => {
   try {
     const { userId, connectionId } = req.body || {};
     if (!userId) {
        res.status(401).send('User id is required');
     }
     const userObj = await User.findOne({ _id: userId }).lean();
     const connectionRequest = userObj.connectionRequests || [];
     const newConnectionRequest = connectionRequest.map((item) => {
        if (String(item.userId) === String(connectionId)) {
        return {
          ...item,
          approved: true
        }
        }
        else {
          return {
            ...item
          }
        }
     })
     await User.findOneAndUpdate({ _id: userId }, {
       $set: {
        connectionRequest: newConnectionRequest
       }
     })
     res.json({ msg:"connection accepeted successfully" });
   }
   catch (err) { 
      res.status(500).json({ msg: "something went wrong" });
   }
}

const updatePost = async (req, res) => {
   try {
      const { userId, postId, updateType, comment, commentId, }= req.body || {};

      if (updateType === 'like') {
         await Post.findOneAndUpdate({ _id: postId },
          { $push: { likes: new mongoose.Types.ObjectId(userId) } }
         )
      }
      else if (updateType === 'comment') {
         await Post.findOneAndUpdate({ _id: postId }, {
            $push: {
               comments: {
                  message: comment,
                  userId: new mongoose.Types.ObjectId(userId)
               }
            }
         })
      }
      else if (updateType === 'commentDelete') {
         await Post.findOneAndUpdate({ _id: postId }, {
            $pull: {
               comments: { commentId: new mongoose.Types.ObjectId(commentId) }
            }
         })
      }
      else if (updateType === 'dislike') {
         await Post.findOneAndUpdate({  _id: postId }, {
            $pull: {
               likes: new mongoose.Types.ObjectId(userId)
            }
         })
      }
      res.json({ msg: "Post updated successfully" });
   }
   catch (err) {
      res.status(500).json({ msg: "something went wrong !" });
   }
}

const connectionRequestSend = async (req, res) => {
    try {
         const { userId, requestTo } = req.body || {};
         const userObj = await User.findOne({ _id: requestTo }).lean();
         await User.findOneAndUpdate({ _id: userObj._id }, {
            $push: {
               connectionRequests: {
                 userId: new mongoose.Types.ObjectId(requestTo),
                 approved: false
               }
            }
         })
         res.json({ msg: "Connection request send successfully" });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ msg: "something went wrong !" });
    }
}

module.exports = { logout, login,  signup, genenrateToken, postCreation, getPosts, updatePost, authenticate, postDeletion, connectionRequestSend, acceptConnection };