const express = require('express');
const { signup, login, logout, genenrateToken, postCreation, getPosts, authenticate, postDeletion, updatePost, connectionRequestSend, acceptConnection, getProfileData ,} = require('../controllers/user.js');

const router = express.Router();


// Route for user signup
router.post('/signup', signup);


// Route for user login
router.post('/login', login);

// Route for user logout
router.post('/logout', logout);

router.post('/refreshToken', genenrateToken);

router.post('/post', authenticate, postCreation);

router.get('/postlist', getPosts);

router.post('/deletePost', authenticate, postDeletion);

router.post('/updatePost', authenticate, updatePost);

router.post('/connectionRequest', authenticate, connectionRequestSend);

router.post('/connectionRequest', authenticate, acceptConnection);

router.get('/get-profile-data', authenticate, getProfileData);
module.exports = router;
