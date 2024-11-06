const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
const config = require('../config.json');

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

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Check if password matches
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate a JWT
    const token = createToken(user._id, config.JWT_EXPIRES_IN);
    const refreshToken = createToken(user._id, config.REFRESH_EXPIRES_IN);

    user.token =token;
    user.refreshToken = refreshToken;

    await user.save();

    res
      .status(200).cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' })
      .header('Authorization', accessToken)
      .json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Error during login', error });
  }
};


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

const authenticate = (req, res) => {
   const accessToken = req.header['Authorization'];
   const refreshToken = req.cookies['refreshToken'];
   if (!accessToken && !refreshToken) {
      res.status(401).send('Access denied no token provided');
   }
   const decoded = jwt.verify(accessToken, config.JWT_SECRET);
   req.user = decoded.user;
   next();

}

module.exports = { logout, login,  signup, genenrateToken };