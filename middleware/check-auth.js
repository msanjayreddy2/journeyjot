const jwt = require("jsonwebtoken");
require("dotenv").config();

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1];
    // console.log(req.headers.authorization);
    if (!token) {
      throw new Error("Authentication failed!");
    }
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);

    req.UserData = { userId: decodedToken.userId, email: decodedToken.email };
    next();
  } catch (err) {
    // console.log(err);
    return next(new HttpError("Authentication failed!", 401));
  }
};
