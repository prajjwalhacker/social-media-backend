const mongoose = require('mongoose');
const config = require('./config.json');
const userRoutes = require('./routes/user.js');
const express = require("express");
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const cors = require('cors');



class Database {
    static connect () {
        return mongoose.connect(config.DB_URL, {
            useUnifiedTopology: true
        })
    }
}

const app = express();



dotenv.config();



const corsOptions = {
   origin: 'http://localhost:3000',
   credentials: true,
   optionsSucessStatus: 200
}
app.use(cors(corsOptions));
app.use(cookieParser())
app.use(express.json())

// Routes
app.use('/api',  userRoutes);





(async ()=>{
   console.log("started connecting");
   await Database.connect();
   console.log("connected");
   app.listen(config.PORT, () => {
    console.log(`server is running on port ${config.PORT}`);
})
})()