const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { validationResult } = require("express-validator");

const User = require("../models/user");
const HttpError = require("../models/http-error");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (er) {
    return next(new HttpError("somethingWent Wrong:", 500));
  }
  res
    .status(201)
    .json({ users: users.map((p) => p.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const { name, email, password } = req.body;
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return next(new HttpError(`invalid credentials ${error.path}`, 404));
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("some thing went wrong", 500));
  }
  if (existingUser) {
    return next(new HttpError("User already Exists", 422));
  }
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(new HttpError("Couldn't create user", 500));
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });
  try {
    await createdUser.save();
  } catch (error) {
    return next(new HttpError("signup  failed!", 500));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "2h" }
    );
  } catch (err) {
    return next(new HttpError("signup  failed!", 500));
  }
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    return next(new HttpError("some thing went wrong", 500));
  }
  if (!existingUser) {
    return next(new HttpError("user doesnt exists", 500));
  }
  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    return next(new HttpError("Couldn't login", 500));
  }
  if (!isValidPassword) {
    return next(new HttpError("Invalid password or username", 500));
  }
  // console.log("loggedIN");
  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "2h" }
    );
  } catch (err) {
    return next(new HttpError("login  failed!", 500));
  }

  res.status(200).json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
