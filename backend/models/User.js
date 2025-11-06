const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// User Schema
// Define user roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  AUTHORITY: 'authority'
};

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER 
    },
    councilArea: { type: String, required: false } // For admin and authority users
  },
  { timestamps: true }
);

// Normalize email
userSchema.pre("save", function (next) {
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
