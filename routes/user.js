const express = require('express');
const { signup, login, logout, genenrateToken } = require('../controllers/user.js');

const router = express.Router();


// Route for user signup
router.post('/signup', signup);

// Route for user login
router.post('/login', login);

// Route for user logout
router.post('/logout', logout);

router.post('/refreshToken', genenrateToken);

module.exports = router;
