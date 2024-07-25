// Importing the express library
const express = require("express");
// Importing the user Controller
const userController = require("../controllers/userController");
const auth = require("../middlewares/auth");
// Creating a router
const userRouter = express.Router();
// Route to register a user
userRouter.post("/", userController.register);

// Route for user login
userRouter.post("/login",auth.isActivated, userController.login);

// Route for user logout
userRouter.get(
  "/logout",
  auth.authenticate,
  auth.isActivated,
  userController.logout
);

// Route to activate user account
userRouter.get("/activate/:id", userController.activateUser);

// Route for forgot password
userRouter.post("/forgot", auth.isActivated, userController.forgotPassword);

// Route for verifying auth string
userRouter.get(
  "/verify/:authString",
  auth.isActivated,
  userController.authVerify
);

// Route for resetting the password
userRouter.post("/reset", auth.isActivated, userController.resetPassword);

// Route for getting user profile
userRouter.get(
  "/",
  auth.authenticate,
  auth.isActivated,
  userController.getProfile
);

// Route for updating user profile
userRouter.put(
  "/",
  auth.authenticate,
  auth.isActivated,
  userController.updateProfile
);

// Route for deleting user
userRouter.delete(
  "/",
  auth.authenticate,
  auth.isActivated,
  userController.deleteUser
);

// Admin Routes
// Fetching all users
userRouter.get(
  "/admin/users",
  auth.authenticate,
  auth.authorize,
  userController.getAllUsers
);

// Exporting the router
module.exports = userRouter;