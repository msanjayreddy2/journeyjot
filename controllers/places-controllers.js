const HttpError = require("../models/http-error");
const uuid = require("uuid");
const { validationResult } = require("express-validator");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const fs = require("fs");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(
      new HttpError(
        "Some thing went wrong ,Could not find the place at this movement",
        404
      )
    );
  }
  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided id.", 404)
    );
  }

  res.json({ place: place.toObject({ getters: true }) }); // => { place } => { place: place }
};

// =====================================================

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let Userplaces;
  try {
    Userplaces = await User.findById(userId).populate("places");
  } catch (error) {
    return next(
      new HttpError(
        "Some thing went wrong ,Could not find the place at this movement",
        404
      )
    );
  }
  if (!Userplaces || Userplaces.places.length === 0) {
    return next(
      new HttpError("Could not find a place for the provided user id.", 404)
    );
  }
  // console.log("someonecame", userId);

  res.json({
    places: Userplaces.places.map((place) => place.toObject({ getters: true })),
  });
};
// ===============================================
const createPlace = async (req, res, next) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    console.log(error);
    return next(new HttpError("Invalid Inputs", 422));
  }
  const { title, description, coordinates, address, creator } = req.body;
  const createdPlace = new Place({
    title,
    description,
    address,
    location: { lat: 1000000, lng: 1000000 },
    image: req.file.path,
    creator,
  });
  let user;
  try {
    user = await User.findById(creator);
  } catch (er) {
    return next(new HttpError("something went wrong", 500));
  }
  if (!user) {
    return next(new HttpError("user not found", 500));
  }
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError("failed to create new place", 500);
    return next(error);
  }
  // await newplace
  // .save()
  // .then(() => {
  //   console.log("added succesfully");
  // })
  // .catch((err) => {
  //   throw new HttpError("failed to create", 500);
  // });
  res.status(201).json({ place: createdPlace });
};
// =================================================
const updatePlaceById = async (req, res, next) => {
  const { title, description } = req.body;
  // console.log("updating");
  const placeId = req.params.pid;
  const errors = validationResult(req);
  // console.log(errors);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid Inputs", 422));
  }

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    return next(new HttpError("Unable to update Place", 500));
  }

  if (!place) {
    return next(new HttpError("Place not found", 404));
  }

  if (place.creator.toString() !== req.UserData.userId) {
    return next(new HttpError("unauthorized user", 401));
  }
  place.title = title;
  place.description = description;
  try {
    await place.save();
  } catch (error) {
    return next(new HttpError("Unable to update Place", 500));
  }

  res.status(200).json({ Place: place.toObject({ getters: true }) });
};

// ===================================================
const deletePlace = async (req, res, next) => {
  const PlaceId = req.params.pid;
  let place;
  try {
    place = await Place.findById(PlaceId).populate("creator");
  } catch (error) {
    return next(new HttpError("something went Wrong", 500));
  }
  if (!place) {
    return next(new HttpError("invalid userID", 500));
  }
  if (place.creator.id !== req.UserData.userId) {
    return next(new HttpError("unauthorized user", 401));
  }
  const Image = place.image;
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError(error, 500));
  }
  fs.unlink(Image, (error) => {
    console.log(error);
  });
  res.status(200).json({ message: "Deleted" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlace = deletePlace;
