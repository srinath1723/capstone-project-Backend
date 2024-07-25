// Importing bcrypt library for encrypting passwords
const bcrypt = require("bcrypt");
// Importing the jwt library
const jwt = require("jsonwebtoken");
// Importing the User model
const User = require("../models/user");
// Importing the transporter for sending emails
const transporter = require("../utils/transporter");
// Importing the EMAIL_ID from the configuration file
const { EMAIL_ID, SECRET_KEY } = require("../utils/config");
// Importing the user helper function to generate an auth string
const { generateRandomString } = require("../helpers/userHelper");

const userController = {
  // API for registering users
  register: async (req, res) => {
    try {
      // Destructuring the request body
      const { firstName, lastName, email, password, salaryPerMonth, role } =
        req.body;

      // Checking if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.json({ message: "This email is already registered." });
      }
      // Encrypting the password
      const hashedPassword = await bcrypt.hash(password, 10);
      // Creating a new user
      const user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        salaryPerMonth,
      });
      // Saving the user to the database
      await user.save();
      // Sending email
      transporter.sendMail({
        from: EMAIL_ID,
        to: email,
        subject: "Activate your account",
        text: `Click here to reset your password: http://localhost:3005/api/v1/users/activate/${user._id}`,
      });
      // Sending a success response
      res.status(201).json({
        message: "Account created successfully. Please check your email to activate your account.",
        user,
      });
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "Registration failed due to a server error. Please try again later." });
    }
  },
  // API to Activate user profile
  activateUser: async (req, res) => {
    try {
      // Fetching the id from url params
      const { id } = req.params;
      // Checking if the id is valid
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }
      // Updating the user status to active
      user.isActive = true;
      await user.save();
      // Sending a success response
      res.status(200).send({ message: "User account has been activated." });
    } catch (error) {
      // Sending an error response
      res.status(500).send({ message: "An error occurred while activating the account. Please try again later." });
    }
  },
  // API for user login
  login: async (req, res) => {
    try {
      // getting the user email and password from the request body
      const { email, password } = req.body;
      // checking if the user exists in the database
      const user = await User.findOne({ email });
      // if the user does not exist, return an error response
      if (!user) {
        return res.status(404).send({ message: "User not found." });
      }
      // if the user is not active, return an error response
      if (!user.isActive) {
        return res.status(403).send({ message: "This account is not yet active." });
      }
      // if the user exists check the password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      // if the password is invalid, return an error response
      if (!isPasswordValid) {
        return res.status(400).send({ message: "Incorrect password." });
      }
      // generating a JWT token
      const token = jwt.sign({ id: user._id }, SECRET_KEY);
      // setting the token as a cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        expires: new Date(Date.now() + 24 * 3600000), // 24 hours from login
      });
      // sending a success response
      res.status(200).json({ message: "Logged in successfully." });
    } catch (error) {
      // sending an error response
      res.status(500).send({ message: "An error occurred during login. Please try again later." });
    }
  },
  // API for user logout
  logout: async (req, res) => {
    try {
      // clearing the cookie
      res.clearCookie("token");
      // sending a success response
      res.status(200).send({ message: "Successfully logged out." });
    } catch (error) {
      // Sending an error response
      res.status(500).send({ message: "An error occurred while logging out. Please try again later." });
    }
  },
  // API for sending email for the user when user wants to reset password
  forgotPassword: async (req, res) => {
    try {
      // Extracting values from request body
      const { email } = req.body;
      // Checking if this email is of a valid user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "No account found with this email address." });
      }
      // Generating auth string
      const authString = generateRandomString();
      // Update user
      user.authString = authString;
      await user.save();
      // Send email
      transporter.sendMail({
        from: EMAIL_ID,
        to: email,
        subject: "Password Reset",
        text: `Click here to reset your password: http://localhost:3005/verify/${authString}`,
      });
      // Sending a success response
      res.status(200).json({
        message: "Password reset link sent to your email address.",
      });
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "An error occurred while sending the password reset email. Please try again later." });
    }
  },
  // API for verifying the user auth string
  authVerify: async (req, res) => {
    try {
      // Extracting values from request params
      const { authString } = req.params;
      // Checking if this auth string is of a valid user
      const user = await User.findOne({ authString });
      if (!user) {
        return res.status(404).json({ message: "Invalid authentication code." });
      }
      // Sending a success response
      res.status(200).json({
        message: "Authentication code verified successfully.",
        email: user.email,
      });
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "An error occurred during verification. Please try again later." });
    }
  },
  // API for resetting password
  resetPassword: async (req, res) => {
    try {
      // Extracting values from request body
      const { email, password } = req.body;
      // Checking if this email is of a valid user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User with this email does not exist." });
      }
      // Encrypting the password
      const hashedPassword = await bcrypt.hash(password, 10);
      // Update user
      user.password = hashedPassword;
      user.authString = "";
      await user.save();
      // Sending a success response
      res.status(200).json({ message: "Password reset successfully." });
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "An error occurred while resetting the password. Please try again later." });
    }
  },

  // API to get user profile information
  getProfile: async (req, res) => {
    try {
      // Getting user id from request parameters
      const id = req.userId;

      // Fetching the user from the database
      const user = await User.findById(
        id,
        "-password -isActive -authString -__v"
      );

      // If user not found, return error response
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // If user found, return the user data
      res.json(user);
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "An error occurred while retrieving the profile. Please try again later." });
    }
  },

  // API to update user profile information
  updateProfile: async (req, res) => {
    try {
      // Getting user id from request parameters
      const id = req.userId;
      const { firstName, lastName, salaryPerMonth, email } = req.body;

      const user = await User.findById(id);

      // If user not found, return error response
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Updating user profile information
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.salaryPerMonth = salaryPerMonth || user.salaryPerMonth;
      user.email = email || user.email;

      // Saving info to the database
      const updatedUser = await user.save();

      // If user found, return the updated user data
      res.json({ message: "User profile updated successfully.", updatedUser });
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "An error occurred while updating the profile. Please try again later." });
    }
  },

  // API to delete user
  deleteUser: async (req, res) => {
    try {
      // Getting user id from request parameters
      const id = req.userId;

      // Finding and deleting the user from the database using the id in the request parameters.
      const user = await User.findByIdAndDelete(id);

      // If user not found, return error response
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // Removing the user cookie
      res.clearCookie("token");

      // returning success response, if user is deleted
      res.json({ message: "User deleted successfully." });
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "An error occurred while deleting the account. Please try again later." });
    }
  },

  // API to fetch all users from the database
  getAllUsers: async (req, res) => {
    try {
      // Fetching all users from the database
      const users = await User.find();

      // Returning the fetched users
      res.json(users);
    } catch (error) {
      // Sending an error response
      res.status(500).json({ message: "An error occurred while fetching users. Please try again later." });
    }
  },
};

module.exports = userController;
