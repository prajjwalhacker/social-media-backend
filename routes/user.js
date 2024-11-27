const express = require('express');
const { signup, login, logout, genenrateToken, analyticsStream, getFollowers, followUser,  commentAddition, postCreation, getPosts, authenticate, postDeletion, likesCreation, updatePost, connectionRequestSend, acceptConnection, getProfileData , getAnotherProfileData, userNameSearch, userUpdate, uploadProfilePicture } = require('../controllers/user.js');

const router = express.Router();

const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(), // Temporarily store files in memory
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit: 5MB
});


// Route for user signup
router.post('/signup', signup);


router.post('/userNameSearch', authenticate,  userNameSearch);


// Route for user login
router.post('/login', login);

router.get('/userNameSearch',userNameSearch)

// Route for user logout
router.post('/logout', logout);

router.post('/userUpdate', authenticate, userUpdate);

router.post('/refreshToken', genenrateToken);

router.post('/post', authenticate, postCreation);

router.get('/postlist', getPosts);

router.post('/followUser', authenticate,  followUser);

router.post('/likes', authenticate, likesCreation);

router.get('/followers', authenticate, getFollowers);

router.post('/commentAddition', authenticate, commentAddition)

router.post('/deletePost', authenticate, postDeletion);

router.post('/streams', authenticate, analyticsStream);

router.post('/updatePost', authenticate, updatePost);

router.post('/uploadPicture', upload.single('image'), uploadProfilePicture);

router.post('/connectionRequest', authenticate, connectionRequestSend);

router.post('/connectionRequest', authenticate, acceptConnection);

router.get('/get-profile-data', authenticate, getProfileData);

router.get('/get-another-profile-data', authenticate, getAnotherProfileData)
module.exports = router;
