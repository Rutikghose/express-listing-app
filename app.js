
    require('dotenv').config();
const express = require("express");
const { storage } = require("./cloudeConfig.js");
const multer = require('multer');
const upload = multer({ storage });
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const ejs = require("ejs");
const app = express();
const port = 8080;
const ejsmate = require("ejs-mate");
const methodOverride = require("method-override");
const path = require("path");
const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const flash = require("connect-flash");
const { env } = require('process');

app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.engine("ejs", ejsmate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));


const dburl=process.env.ATLASDB_URL;

async function main() {
    await mongoose.connect(dburl);
}
main()
    .then(() => console.log("✅ Database connected successfully"))
    .catch((err) => console.log("❌ Database connection error:", err));


const store= MongoStore.create({
    mongoUrl:dburl,
    crypto:{
        secret: process.env.SESSION_SECRET 
    },
      touchAfter: 24 * 3600 ,

});

store.on("error",()=>{
    console.log(err); 
})

const sessionConfig = {
    store,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
         httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", 
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};


app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.activeCategory = null;
    next();
});




passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


const validCategories = [
    "Trending", "Room", "IconicCities", "Mountains",
    "Castles", "AmazingPools", "Camping", "Farms", "Arctic"
];


app.get("/demouser", async (req, res) => {
    try {
        const sampleuser = new User({ email: "rutikghose@gmail.com", username: "rutik" });
        const result = await User.register(sampleuser, "rutik123");
        res.send(result);
    } catch (error) {
        res.status(400).send("Error creating demo user: " + error.message);
    }
});


app.get("/signup", (req, res) => res.render("signup.ejs"));

app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            req.flash("error", "All fields are required");
            return res.redirect("/signup");
        }
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);
        req.logIn(registeredUser, (error) => {
            if (error) {
                req.flash("error", "Error logging in: " + error.message);
                return res.redirect("/signup");
            }
            req.flash("success", "Welcome to Wanderlust! Your account has been created.");
            res.redirect("/alllistings");
        });
    } catch (error) {
        console.error("Signup error:", error);
        req.flash("error", error.name === 'UserExistsError' ? "A user with this username already exists" : "Error creating account");
        res.redirect("/signup");
    }
});

app.get("/login", (req, res) => res.render("login.ejs"));

app.post("/login",
    passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }),
    (req, res) => {
        req.flash("success", `Welcome back, ${req.user.username}!`);
        const redirectUrl = req.session.returnTo || "/alllistings";
        delete req.session.returnTo;
        res.redirect(redirectUrl);
    }
);

app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.flash("success", "You have logged out successfully");
        res.redirect("/login");
    });
});


app.get("/", (req, res) => res.redirect("/alllistings"));

app.get("/alllistings", async (req, res) => {
    try {
        const alllistings = await Listing.find({});
        res.render("index.ejs", { alllistings, activeCategory: null });
    } catch (error) {
        console.error("Error fetching listings:", error);
        req.flash("error", "Error loading listings");
        res.render("index.ejs", { alllistings: [], activeCategory: null });
    }
});

app.get("/listing/category/:type", async (req, res) => {
    try {
        const category = req.params.type;
        if (!validCategories.includes(category)) {
            req.flash("error", "Invalid category selected");
            return res.redirect("/alllistings");
        }
        const listings = await Listing.find({ category });
        res.render("index.ejs", { alllistings: listings, activeCategory: category });
    } catch (error) {
        console.error("Category filter error:", error);
        req.flash("error", "Error filtering listings");
        res.redirect("/alllistings");
    }
});

app.post("/listings/search", async (req, res) => {
    const searchstring = req.body.query;
    const listings = await Listing.find({
        $or: [
            { title: { $regex: searchstring, $options: "i" } },
            { country: { $regex: searchstring, $options: "i" } }
        ]
    });
    res.render("index", { alllistings: listings });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You must be logged in to create a listing");
    res.redirect("/login");
}


app.get("/list", (req, res) => {
   
     res.render("newlisting.ejs");
});

app.post("/listing", isLoggedIn, upload.single("img"), async (req, res) => {
    try {
        const { title, description, price, location, country, category } = req.body;

       
        if (!title || !description || !price || !location || !country || !category) {
            req.flash("error", "All fields are required");
            return res.redirect("/newlisting");
        }
        if (!validCategories.includes(category)) {
            req.flash("error", "Invalid category selected");
            return res.redirect("/newlisting");
        }
        if (!req.file) {
            req.flash("error", "Please upload an image");
            return res.redirect("/newlisting");
        }

        const newListing = new Listing({
            title,
            description,
            price: parseFloat(price),
            location,
            country,
            category,
            image: req.file.path,
            owner: req.user._id
        });

        await newListing.save();
        req.flash("success", "Listing created successfully!");
        res.redirect("/alllistings");

    } catch (error) {
        console.error("Error creating listing:", error);
        req.flash("error", "Something went wrong while creating the listing");
        res.redirect("/newlisting");
    }
});



app.get("/listing/:id", async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("showlisting.ejs", { listing });
});

app.put("/listing/:id", isLoggedIn, upload.single("img"), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, location, country, category } = req.body;

        const updateData = {
            title,
            description,
            price,
            location,
            country,
            category
        };

        if (req.file) {
            updateData.image = req.file.path;
        }

        await Listing.findByIdAndUpdate(id, updateData);
        req.flash("success", "Listing updated successfully!");
        res.redirect(`/listing/${id}`);
    } catch (error) {
        console.error("Error updating listing:", error);
        req.flash("error", "Error updating listing");
        res.redirect(`/listing/${id}/edit`);
    }
});


app.get("/listing/:id/edit", isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing not found");
            return res.redirect("/alllistings");
        }

        res.render("eadit.ejs", { listing });
    } catch (error) {
        console.error("Error loading edit page:", error);
        req.flash("error", "Error loading edit page");
        res.redirect("/alllistings");
    }
});


app.delete("/listing/:id", isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        await Listing.findByIdAndDelete(id);

        req.flash("success", "Listing deleted successfully!");
        res.redirect("/alllistings");
    } catch (error) {
        console.error("Error deleting listing:", error);
        req.flash("error", "Error deleting listing");
        res.redirect("/alllistings");
    }
});


app.post("/listing/:id/review", isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            req.flash("error", "Invalid listing ID");
            return res.redirect("/alllistings");
        }
        const { range, comments } = req.body.Review;
        if (!range || !comments) {
            req.flash("error", "Please provide both rating and comments");
            return res.redirect(`/listing/${id}`);
        }
        const rating = parseInt(range);
        if (rating < 1 || rating > 5) {
            req.flash("error", "Rating must be between 1 and 5");
            return res.redirect(`/listing/${id}`);
        }
        const review = new Review({
            rating,
            comments: comments.trim(),
            author: req.user._id
        });
        await review.save();
        const listing = await Listing.findById(id);
        if (!listing) {
            req.flash("error", "Listing not found");
            return res.redirect("/alllistings");
        }
        listing.review.push(review._id);
        await listing.save();
        req.flash("success", "Review added successfully!");
        res.redirect(`/listing/${id}`);
    } catch (error) {
        console.error("Error adding review:", error);
        req.flash("error", "Error adding review");
        res.redirect(`/listing/${id}`);
    }
});

app.delete("/listing/:id/review/:reviewid", isLoggedIn, async (req, res) => {
    try {
        const { id, reviewid } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(reviewid)) {
            req.flash("error", "Invalid ID");
            return res.redirect("/alllistings");
        }
        const review = await Review.findById(reviewid);
        const listing = await Listing.findById(id);
        if (!review || !listing) {
            req.flash("error", "Review or listing not found");
            return res.redirect(`/listing/${id}`);
        }
        const canDelete = (
            review.author && review.author.equals(req.user._id)
        ) || (
            listing.owner && listing.owner.equals(req.user._id)
        );
        if (!canDelete) {
            req.flash("error", "You don't have permission to delete this review");
            return res.redirect(`/listing/${id}`);
        }
        await Listing.findByIdAndUpdate(id, { $pull: { review: reviewid } });
        await Review.findByIdAndDelete(reviewid);
        req.flash("success", "Review deleted successfully!");
        res.redirect(`/listing/${id}`);
    } catch (error) {
        console.error("Error deleting review:", error);
        req.flash("error", "Error deleting review");
        res.redirect(`/listing/${id}`);
    }
});


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You must be logged in to do that");
    res.redirect("/login");
}

app.use((req, res) => {
    req.flash("error", "Page not found!");
    res.redirect("/alllistings");
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    req.flash("error", "Something went wrong!");
    res.redirect("/alllistings");
});


app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
