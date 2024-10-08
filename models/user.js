const mongoose = require('mongoose');

// Connect to the MongoDB database
mongoose.connect('mongodb://127.0.0.1:27017/miniproject', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define the user schema
const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    age: { type: Number, min: 0 },
    posts: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'post' }
    ],
    friends: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
    ]
});

// Export the user model
module.exports = mongoose.model('user', userSchema);
