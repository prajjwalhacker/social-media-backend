const express = require('express');
const { signup, login, logout, genenrateToken, followUser,  commentAddition, postCreation, getPosts, authenticate, postDeletion, likesCreation, updatePost, connectionRequestSend, acceptConnection, getProfileData , getAnotherProfileData, userNameSearch, userUpdate } = require('../controllers/user.js');

const router = express.Router();


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

router.post('/commentAddition', authenticate, commentAddition)

router.post('/deletePost', authenticate, postDeletion);

router.post('/updatePost', authenticate, updatePost);

router.post('/connectionRequest', authenticate, connectionRequestSend);

router.post('/connectionRequest', authenticate, acceptConnection);

router.get('/get-profile-data', authenticate, getProfileData);

router.get('/get-another-profile-data', authenticate, getAnotherProfileData)
module.exports = router;
