// Import necessary modules
const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const path = require('path');
const userModel = require("./models/user"); // User model
const postModel = require("./models/post"); // Post model
const bcrypt = require("bcrypt"); // For hashing passwords
const jwt = require('jsonwebtoken'); // For creating JSON Web Tokens
const { title } = require('process');

// Set the view engine to EJS for rendering HTML views
app.set("view engine", "ejs");

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Use cookie parser middleware to handle cookies
app.use(cookieParser());

// Route to render the home page (step 1 )
app.get("/", (req, res) => {
    res.render("index");
});



// Route to handle user registration (step 2)
app.post("/register", async (req, res) => {
    // Extract user details from the request body
    let { username, name, email, password, age } = req.body;

    // Check if the user already exists
    let user = await userModel.findOne({ email });
    if (user) return res.status(500).send("User already registered");

    // Hash the password before saving it to the database
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            // Create a new user with hashed password
            let user = await userModel.create({
                username,
                name,
                email,
                age,
                password: hash
            });
            // Redirect to the login page after successful registration
            res.redirect('/login');
        });
    });
});

// Route to render the login page (step 3) 
app.get("/login", (req, res) => {
    res.render("login");
});

// Route to handle user login (step 4)
app.post("/login", async (req, res) => {
    // Extract email and password from the request body
    let { email, password } = req.body;

    // Find the user by email
    let user = await userModel.findOne({ email });
    if (!user) return res.status(500).send("Something went wrong");

    // Compare the provided password with the hashed password in the database
    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            // If password matches, create a JWT token
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh",{expiresIn:'1h'});
            // Store the token in a cookie
            res.cookie("token", token);
            // Redirect to the profile page
            res.status(200).redirect("/profile");
        } else {
            // If password doesn't match, redirect to the login page
            res.redirect("/login");
        }
    });
});

// Route to handle user logout (step 5)
app.get("/logout", (req, res) => {
    // Clear the cookie
    res.cookie("token", "");
    // Redirect to the login page
    res.redirect("/login");
});

// Middleware to check if the user is logged in
function isLoggedIn(req, res, next) {
    // Check if the token cookie is empty
    if (req.cookies.token === "") {
        // If empty, redirect to the login page
        res.redirect("/login");
    } else {
        // Verify the token and extract user data
        let data = jwt.verify(req.cookies.token, "shhhh");
        req.user = data; // Store user data in the request object
        next(); // Proceed to the next middleware or route handler
    }
}

// Route to render the user's profile page (step 6)
app.get("/profile", isLoggedIn, async (req, res) => {
    // Find the user and populate their posts (req user comes from middleware)
    let user = await userModel.findOne({ email: req.user.email }).populate('posts').populate('friends');
    // Render the profile page with user data
    res.render("profile", { user });
});

// Route to handle creating a new post (step 7)
app.post("/post", isLoggedIn, async (req, res) => {
    // Find the user who is creating the post
    let user = await userModel.findOne({ email: req.user.email });
    
    // Create a new post associated with the user
    let post = await postModel.create({
        user: user._id,
        content: req.body.content,
        title:req.body.title
    });
    
    // Add the post ID to the user's posts array
    user.posts.push(post._id);
    await user.save(); // Save the user document
    
    // Redirect to the profile page after creating the post
    res.redirect("/profile");
});

// Route to handle liking/unliking a post
app.get("/like/:id", isLoggedIn, async (req, res) => {  
    // Find the post by ID and populate user details
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    // Check if the user has already liked the post
    if (post.likes.indexOf(req.user.userid) === -1) {
        // If not liked, add the user's ID to the likes array
        post.likes.push(req.user.userid);
    } else {
        // If already liked, remove the user's ID from the likes array
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    
    // Save the updated post document
    await post.save();
    
    // Redirect to the profile page
    res.redirect("/profile");
});

app.get("/edit/:id",isLoggedIn,async(req,res)=>{
    const post=await postModel.findOne({_id:req.params.id})
    if(post.user!=req.user.userid){
        res.send("Not Autorized")
    }
    else{
        res.render("EditPost",{post})
    }
    
})

app.post("/edit/:id",isLoggedIn,async(req,res)=>{
    let post=await postModel.findOne({_id:req.params.id})
    if(post.user!=req.user.userid){
        res.send("Not Autorizzed")
    }
    else{
        post.content=req.body.content
        post.title=req.body.title
        await postModel.findOneAndUpdate({_id:req.params.id},post)
        res.redirect("/profile")
    }
})
app.get("/delete/:id",isLoggedIn,async(req,res)=>{
    const post=await postModel.findOne({_id:req.params.id})
    postModel.deleteOne({_id:req.params.id })
  .then(result => {
    console.log('Document deleted:', result.deletedCount);
  })
  .catch(err => console.error('Error deleting document:', err));
  res.redirect("/profile")
    
})
app.get("/AddFriend", (req, res) => {
   res.render("friends")
});
app.post("/search",async(req,res)=>{
     const friend = await (userModel.findOne({ email: req.body.email }))   
    res.render("addfriend",{ friend})
})
app.post("/mitr",isLoggedIn, async(req,res)=>{
    const friend = await (userModel.findOne({_id:req.body.userId})) 
    const user=await userModel.findOne({email:req.user.email}) 
    user.friends.push(friend)
    await user.save()
    console.log(friend)

    res.redirect("/profile")
})

app.get("/friend/:friend",isLoggedIn,async (req,res)=>{
    const friend=await userModel.findOne({email:req.params.friend}).populate('posts')
    const user=await userModel.findOne({email:req.user.email}) 
    res.render("screen",{friend,user})
})

// Start the server and listen on port 3000
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
