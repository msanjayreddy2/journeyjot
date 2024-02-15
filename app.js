const express = require("express");
const bodyParser = require("body-parser");
const HttpError = require("./models/http-error");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const userRoutes = require("./routes/users-routes");
const placesRoutes = require("./routes/places-roues");
const app = express();
app.use(bodyParser.json());

console.log(path.join("uploads", "images"));
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Orgin,X-Requested-With,Content-Type,Accept,Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "*");
  next();
});
// console.log(process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_NAME);
const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster-temp.nxiqsdq.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

app.use("/api/places/", placesRoutes);

app.use("/api/users", userRoutes);

app.use((req, res, next) => {
  throw new HttpError("no such route", 404);
});

app.use((error, req, res, next) => {
  //   console.log(error.stack);
  if (req.file) {
    fs.unlink(req.file.path, (error) => {
      console.log(error);
    });
  }
  if (res.headerSent) {
    return res.json(error);
  }
  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occurred" });
});

mongoose
  .connect(url)
  .then(() => {
    app.listen(process.env.PORT || 5000);
    console.log("connection successful");
  })
  .catch((err) => {
    console.log(err);
  });
