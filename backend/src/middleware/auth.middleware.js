const jwt = require("jsonwebtoken");
function artistAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({
      message: "User Not  Found",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded", decoded);
    if (decoded.role !== "artist") {
      return res.status(401).json({
        message: "You are not allowed to create music",
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      message: "User not Valid",
    });
  }
}
function userAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({
      message: "User Not  Found",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "artist" && decoded.role !== "user") {
      return res.status(401).json({
        message: "You are not allowed to create music",
      });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      message: "User not Valid",
    });
  }
}
function optionalAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.log(error);
  }

  next();
}

module.exports = { artistAuth, userAuth, optionalAuth };
