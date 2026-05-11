const userModel = require("../model/auth.model");
const jwt = require("jsonwebtoken");
const bcript = require("bcryptjs");
async function registerUser(req, res) {
  const { userName, userEmail, password, role = "user" } = req.body;
  isUserAlreadyExist = await userModel.findOne({
    $or: [{ userName }, { userEmail }],
  });
  if (isUserAlreadyExist) {
    return res.status(409).json({
      message: "User Already Exist",
    });
  }
  const hash = await bcript.hash(password, 10);
  const user = await userModel.create({
    userName,
    userEmail,
    password: hash,
    role,
  });
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
  );
  res.cookie("token", token);
  res.status(201).json({
    message: "User Created and Logged in Successfully",
    user: {
      name: userName,
      email: userEmail,
      role,
    },
  });
}
async function loginUser(req, res) {
  const { userName, userEmail, password } = req.body;
  user = await userModel.findOne({
    $or: [{ userName }, { userEmail }],
  });
  if (!user) {
    return res.status(401).json({
      message: "User Does Not Exist",
    });
  }

  const isPasswwordValid = await bcript.compare(password, user.password);
  if (!isPasswwordValid) {
    return res.status(401).json({
      message: "Wrong Credentials",
    });
  }
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
  );
  res.cookie("token", token);
  res.status(200).json({
    message: "User logged in ",
    user: {
      name: user.userName,
      email: user.userEmail,
      role: user.role,
    },
  });
}
async function logoutUser(req, res) {
  res.clearCookie("token");
  res.status(200).json({
    message: "User logged out ",
  });
}

module.exports = { registerUser, loginUser, logoutUser };
