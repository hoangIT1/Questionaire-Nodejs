require('dotenv').config()
const express = require('express');
const app = express()
const { pool } = require("./dbConfig");
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require ('express-flash');
const passport = require("passport");
const jwt = require('jsonwebtoken');
const db = require('./questQuery');
const initializePassport = require('./passportConfig');
const { user } = require('pg/lib/defaults');

initializePassport(passport);

const PORT = process.env.PORT || 4000;

app.set("view engine", "ejs");
app.use(express.json())
app.use(express.urlencoded({ extended: false})); // send details from Front end


app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: false

    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());


app.get("/", (req, res) => {
    res.render("index");
});

app.get("/users/register", checkAuthenticated, (req, res) => {
    res.render("Register");
});

app.get("/users/login", checkAuthenticated ,(req, res) => {
    res.render("Login");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
    const sql = `SELECT question FROM questions`;
    pool.query(sql, (error, results) => {
        if (error) {
            throw error;
        }
        res.render("Dashboard", {todoDbList: results.rows, user: req.user.name})
    });
});

app.get('/users/logout', (req, res) => {
    req.logOut();
    req.flash("success_msg", "You have logged out");
    res.redirect("/users/login");
});

app.post("/users/dashboard", async (req, res) => {
    let {quest1, quest2, quest3, quest4, quest5, quest6, quest7, quest8, quest9, quest10} = req.body;
    // let errors = [];
    // if (!quest1 || !quest2 || !quest3 || !quest4 || !quest5 || !quest6 || !quest7 || !quest8 || !quest9 || !quest10 ) {
    //     errors.push({message: "Please enter all fields"});
    // }
    let labelsFromDb = [];
    let score = 0;
    const sql = `SELECT answer FROM questions`;
    pool.query(sql, (error, results) => {
        if (error) {
            throw error;
        }
        if (results.rows[0].answer == quest1) score++;
        if (results.rows[1].answer == quest2) score++;
        if (results.rows[2].answer == quest3) score++;
        if (results.rows[3].answer == quest4) score++;
        if (results.rows[4].answer == quest5) score++;
        if (results.rows[5].answer == quest6) score++;
        if (results.rows[6].answer == quest7) score++;
        if (results.rows[7].answer == quest8) score++;
        if (results.rows[8].answer == quest9) score++;
        if (results.rows[9].answer == quest10) score++;
        console.log(score);
        req.flash('success_msg', `You are now finish Quiz. Your score is: ${score}`);
        res.render('success',{score: score});
    })
    
});

app.post("/users/register", async (req, res) => {
    let { name, email, password, password2 } = req.body;

    let errors = [];
    if (!name || !email || !password || !password2 ) {
        errors.push({message: "Please enter all fields"});
    }
    if (password.length < 6) {
        errors.push({ message: "Password should be at least 6 characters"});
    }
    if (password != password2) {
        errors.push({ message: "Password do not match"});
    }
    if (errors.length > 0) {
        res.render('register', { errors });
    } else {
        //form validation has passed
        let hashedPassword = await bcrypt.hash(password, 10);

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`, 
            [email], 
            (err, results) => {
                if (err) {
                    throw err
                }
                console.log(results.rows);

                if (results.rows.length > 0) {
                    errors.push({message: "Email already registered"});
                    res.render('register', { errors });
                } else {
                    pool.query(
                        `INSERT INTO users (name, email, password)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`, 
                        [name, email, hashedPassword], 
                        (err, results) => {
                            if (err) {
                                throw err;
                            }
                            console.log(results.rows);
                            req.flash('success_msg', "You are now registered. Please log in");
                            res.redirect("/users/login");
                        }
                    )
                }
            }
        );
    }
});

app.post("/users/login", passport.authenticate('local', {
    successRedirect: "/users/dashboard",
    failureRedirec: "/users/login",
    failureFlash: true
}))

function checkAuthenticated(req, res, next){
    if (req.isAuthenticated()) {
        return res.redirect("/users/dashboard");
    }
    next();
}

function checkNotAuthenticated(req, res, next){
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/users/login");
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


