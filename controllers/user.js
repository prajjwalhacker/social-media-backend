const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
const config = require('../config.json');
const Post = require('../models/Post');
const mongoose = require('mongoose');
const ProfileAnalytics = require('../models/ProfileAnalytics');
const moment = require('moment');
const { Storage } = require('@google-cloud/storage');

dotenv.config();

const storage = new Storage({
   keyFilename: 'GOOGLE_API_CRED.json', 
});

const bucket = storage.bucket('vercel-static-bucket-test'); 


const createToken = (userId, expiresIn) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: expiresIn,
  });
};


const signup = async (req, res) => {
  try {

    const { username, email, password } = req.body;


    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Create a new user
    const newUser = new User({ username, email, password });

    await newUser.save();
  
    res.send(newUser);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error during signup', error });
  }
};

const getFollowers = async (req, res) => {
   try {
      const { followersId  } = req.body;
      const users = await User.find({ _id: { $in: followersId.map((item) => new mongoose.Types.ObjectId(item)) } }).select({ username: 1 });
      return res.json({ userList: users });
   }
   catch (err) {
      console.log("err");
      console.log(err);
      return res.status(500).json({ msg: "Something went wrong !" });
   }
}

const uploadProfilePicture =  async (req, res) => {
    try {
       if (!req.file) {
          res.json({ message: "file is required" });
       }
       const userObj = await User.findOne({ _id: req.id });
       const blob = bucket.file(req.file.originalname);
       const blobStream = blob.createWriteStream({
         metadata: {
            contentType: req.file.mimetype,
         },
         resumable: false,
        });

        blobStream.on('error', (error) => {
          console.error(error);
          res.status(500).send({ error: 'File upload failed.' });
        });

         blobStream.on('finish', async () => {
            // Make the file publicly accessible
            await blob.makePublic();
            // Construct the public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            userObj.profileUrl = publicUrl;
            await userObj.save();
            res.status(200).send({ message: 'File uploaded successfully', url: publicUrl });
         });

         blobStream.end(req.file.buffer);
    }
    catch (err) {
       cosole.log("Erroro");
       console.log(err);
    }
}


const commentAddition = async (req, res) => {
    try {
       const { comment, postId } = req.body || {};

       console.log("comment and postId");
       console.log(comment);
       console.log(postId);

       const newPost = await Post.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(postId) }, {
         $push: { 
            comments: {
            userId: new mongoose.Types.ObjectId(req.id),
            message: comment
         } 
         }
       }, {
         new: true
       })

       return res.json({ newPost });

    }
    catch (err) {
      console.log(err);
      console.log("error");
       return res.status(500).json({ message: "Something went wrong" });
    }
}

const followUser = async (req, res) => {
     try {
        const {  userId } = req.body;

        if (!userId) {
           res.status(400).json({ message: "userId is required" });
        }
        else {
          const user = await User.findOne({ _id: new mongoose.Types.ObjectId(userId) }).lean();

          const followerList = user.followers.map((item) => String(item));

          let updateObj1 = {};
          let updateObj2 = {};
          if (followerList.includes(String(userId))) {
             updateObj1 = {
                $pull: {
                   followers: new mongoose.Types.ObjectId(req.id)
                }
             }
             updateObj2 = {
                $pull: {
                  followed: new mongoose.Types.ObjectId(req.id)
                }
             }
          }
          else {
            updateObj1 = {
               $push: {
                  followers: new mongoose.Types.ObjectId(req.id)
               }
            }
            updateObj2 = {
               $push: {
                 followed: new mongoose.Types.ObjectId(req.id)
               }
            }
          }

           await User.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(userId) }, updateObj1);
           await User.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(req.id) }, updateObj2);
        }
        res.json({ message: "followed successfully" });
     }
     catch (err) {
        res.status(500).json({ message: "Something went wrong" });
     }
}

const analyticsStream = async (req, res) => {
   try {
      const { userId, visitedUserId } = req.body;
      const startDate = moment().startOf('date').toDate();

      const profileAnalytics = await ProfileAnalytics.findOne({ creationDate: {
         $gt: startDate
      } }).lean();
      
      if (!profileAnalytics) {
         await ProfileAnalytics.create({ _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(userId), totalVisits: 1, peopleVisted: [
            {
               peopleId: new mongoose.Types.ObjectId(visitedUserId),
               visitedAt: new Date()
            }
         ] })
      }
      else {
         await ProfileAnalytics.findOneAndUpdate({ userId: new mongoose.Types.ObjectId(userId) }, {
            $push: {
               peopleVisited: {
                  peopleId: new mongoose.Types.ObjectId(visitedUserId),
                  visitedAt: new Date()
               }
            }
         })
      }
      res.json({ message: "analytics record saved successfully" });
   }
   catch (err) {
      res.status(500).json({ message: "something went wrong" });
   }
}

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
       },
    }, { returnDocument: 'after', new: true });

    console.log("newUser");
    console.log(newUser);

    res
      .status(200).cookie('refreshToken', refreshToken, {
         secure: true, // Ensure 'secure' is true in production for HTTPS
         httpOnly: true,
         sameSite: "None"
      })
      .header('Authorization', token)
      .json({ message: 'Login successful', newUser });
  } catch (error) {
    console.log(error, "error")
    res.status(500).json({ message: 'Error during login', error });
  }
};

const getProfileData = async (req, res)=> {
   try {
    if (!req.id) {
       res.status(400).json({ message: 'user id is required' });
    }
    const profileData = await User.findOne({ _id: req.id }).lean();

    res.json({ profileData });
   }
   catch (err) {
      console.log("error");
      console.log(err);
      res.status(500).json("something went wrong");
   }
}

const userUpdate = async (req, res) => {
   try {
      const { userWelcomeModal } = req.body;

      const newUser = await User.findOneAndUpdate({ _id: req.id }, {
         $set: {
            userWelcomeModal
         }
      }, { new: true });

      res.json({ newUser });
   }
   catch (err) {
      res.status(500).json({ message: "something went wrong" });
   }
}

const postCreation = async (req, res) => {
    try {
      const { userId, post, updateType, postId } = req.body;
      if (!post) {
        return res.status(401).send('post message is required');
      }
      const newPost = new Post({ userId: new mongoose.Types.ObjectId(req.id), message: post });
      await newPost.save();
      const postList = await Post.find({ userId: new mongoose.Types.ObjectId(req.id) }).sort({ createdAt: -1 }).limit(10);
      res.json({ postList });
    }
    catch (err) {
      console.log(err);
      res.status(500).json({ message: 'Error during post creation', err });    
    }
}

const likesCreation = async (req, res) => {
    const { userId, postId } = req.body;
    try {
       if (!postId || !userId) {
          res.status(400).json({ message: "Required field missing" });
       }
       else {
         const post = await Post.findOne({ _id: postId }).lean();
         let postObj;
         const likesArr = post.likes.map((item) => new mongoose.Types.ObjectId(item)) || [];
         if (likesArr.includes(userId)) {
            postObj = await Post.findOneAndUpdate({ _id: postId }, {
               $pull: {
                  likes: new mongoose.Types.ObjectId(userId)
               }
            }, {
               new: true
            })
         }
         else {
            postObj = await Post.findOneAndUpdate({ _id: postId }, {
               $push: {
                  likes: new mongoose.Types.ObjectId(userId)
               }
            }, {
               new: true
            })
         }
        
         const usersData = await User.find({ _id: {  $in: postObj.likes.map((item) => new mongoose.Types.ObjectId(item)) } }).select({ username: 1 });
         return res.json({ usersData });
       }
    }
    catch (err) {
      console.log("err");
      console.log(err);
      return res.status(500).json({ message: "something went wrong" });
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
    .cookie('refreshToken', '').header('Authorization', '')
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
      accessToken = jwt.sign({ user: decoded.id }, config.JWT_SECRET, { expiresIn: '1h' });
      await User.findOneAndUpdate({ _id: decoded.id }, {
        $set: {
           token: accessToken 
        }
      })
   }


   jwt.verify(accessToken, config.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.id = user.user;
    next();
   });
}

const getPosts = async (req, res) => {
  try {
   const userId = req.id;
   const postList = await Post.find().sort({ createdAt: -1 }).limit(10).lean();

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

const getAnotherProfileData = async (req, res) => {
    try {
        const { userId } = req.query;
        const userData = await User.findOne({ _id: userId }).select({ refreshToken: 0, token: 0 }).lean();
        res.json({ userData });
    }
    catch (err) {
        res.status(500).json({ msg: "something went wrong" });
    }
}

const profileAnalytics = async (req, res)=> {
    try {
       const { userId, viewerUserId } = req.body || {};
       const profileAnalytics = await ProfileAnalytics.findOne({
          userId
       }).lean();
       if (!profileAnalytics) {
          const profileAnalyticsObj = new ProfileAnalytics({ userId: new mongoose.Types.ObjectId(userId), totalVisits: 1, peopleVisted: [{ peopleId: viewerUserId, visitedAt: new Date()  }] });
          await profileAnalyticsObj.save();
       }
       else {
          const peopleVisited = profileAnalytics.peopleVisited;
          const reqIndex = peopleVisited.findIndex((item) => String(item.peopleId) === String(viewerUserId));
          if (reqIndex === -1) {
             peopleVisted.push({ userId: new mongoose.Types.ObjectId(viewerUserId), visitedAt: new Date() });
          }
          await ProfileAnalytics.findOneAndUpdate({ userId }, {
             $set: {
               totalVisits: Number(profileAnalytics.totalVisits) + 1,
               peopleVisited
             }
          })
       }
       res.json({ msg: "analytics recorded successfully" });
    }
    catch (err) {
        res.status(500).json({ msg: "something went wrong" });
    }
}

const userNameSearch = async (req,res) => {
    const { searchTerm } = req.query;

    if (!searchTerm) {
      return res.json({ users: [] });
    }

    const aggregationPipelines = [
      {
         $match: {
           username: { $regex: searchTerm, $options: "i" } // "i" for case-insensitive matching
         }
       },
       {
         $project: {
           refreshToken: 0, // Exclude refreshToken
           token: 0         // Exclude token
         }
       }
    ]

    const users = await User.aggregate(aggregationPipelines);
    

    return res.json({ users })
    
}

module.exports = { logout, getFollowers, analyticsStream, uploadProfilePicture, commentAddition, followUser, login,  signup, genenrateToken, likesCreation, userUpdate, postCreation, getPosts, updatePost, authenticate, postDeletion, connectionRequestSend, acceptConnection, getProfileData, profileAnalytics, getAnotherProfileData, userNameSearch };