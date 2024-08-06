const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const connectToDatabase = require('./db'); 
const app = express();

connectToDatabase().then(db => {
  app.use((req, res, next) => {
    req.db = db; 
    next();
  });

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.set("view engine", "hbs");
  const templatePath = path.join(__dirname, "../templates");
  app.set("views", templatePath);
  app.use(express.static(path.join(__dirname, '../public')));
  app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
  }));

  app.get("/", (req, res) => {
    res.render("login");
  });

  app.get("/signup", (req, res) => {
    res.render("signup");
  });

  app.post("/signup", async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).send("Name and password are required");
    }

    const db = req.db; // Access the database object from middleware

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const collection = db.collection("users");
      await collection.insertOne({ name, password: hashedPassword });
      console.log("Data inserted successfully:", { name, hashedPassword });
      res.render("login");
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.post("/login", async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).send("Name and password are required");
    }

    const db = req.db; 

    const collection = db.collection("users");
    try {
      const user = await collection.findOne({ name });

      if (!user) {
        console.log("User not found:", name);
        return res.status(400).send("Invalid username or password");
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        console.log("Password mismatch for user:", name);
        return res.status(400).send("Invalid username or password");
      }

      req.session.userId = user._id; 
      res.render("home");
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).send("Error logging out");
      }
      res.redirect("/"); 
    });
  });

  function checkAuth(req, res, next) {
    if (!req.session.userId) {
      return res.redirect("/");
    }
    next();
  }

  app.get("/home", checkAuth, (req, res) => {
      res.render("home");
  });

  app.listen(3000, () => {
      console.log("Server started on port 3000");
  });
}).catch(err => {
  console.error('Failed to connect to the database. Server not started.', err);
});
