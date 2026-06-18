const userModel = require("../model/auth.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
  );
}

function setAuthCookie(res, user) {
  res.cookie("token", createAuthToken(user), cookieOptions);
}

function formatUser(user) {
  return {
    name: user.userName,
    email: user.userEmail,
    role: user.role,
  };
}

async function getUniqueUserName(name, email) {
  const fallbackName = email.split("@")[0];
  const baseName = (name || fallbackName).trim() || fallbackName;
  let userName = baseName;
  let suffix = 1;

  while (await userModel.exists({ userName })) {
    userName = `${baseName}${suffix}`;
    suffix += 1;
  }

  return userName;
}

async function registerUser(req, res) {
  try {
    const { userName, userEmail, password, role = "user" } = req.body;
    const isUserAlreadyExist = await userModel.findOne({
      $or: [{ userName }, { userEmail }],
    });
    if (isUserAlreadyExist) {
      return res.status(409).json({
        message: "User Already Exist",
      });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      userName,
      userEmail,
      password: hash,
      role,
      authProvider: "local",
    });
    setAuthCookie(res, user);
    res.status(201).json({
      message: "User Created and Logged in Successfully",
      user: formatUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error while registering user",
    });
  }
}
async function loginUser(req, res) {
  try {
    const { userName, userEmail, password } = req.body;
    const user = await userModel.findOne({
      $or: [{ userName }, { userEmail }],
    });
    if (!user || !user.password) {
      return res.status(401).json({
        message: "User Does Not Exist",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Wrong Credentials",
      });
    }
    setAuthCookie(res, user);
    res.status(200).json({
      message: "User logged in ",
      user: formatUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error while logging in",
    });
  }
}
async function googleLogin(req, res) {
  try {
    const { credential } = req.body;
    console.log("Google login attempt with credential:", credential);

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "Google login is not configured",
      });
    }

    let payload;
    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
      console.log("Google token payload:", payload);
    } catch (error) {
      console.log(error);
      return res.status(401).json({
        message: "Invalid Google token",
      });
    }

    if (!payload || !payload.email || !payload.sub) {
      return res.status(401).json({
        message: "Invalid Google token",
      });
    }

    if (!payload.email_verified) {
      return res.status(401).json({
        message: "Google email is not verified",
      });
    }

    let user = await userModel.findOne({ userEmail: payload.email });

    if (user) {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(401).json({
          message: "Google account does not match this user",
        });
      }

      if (!user.googleId) {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {
      const userName = await getUniqueUserName(payload.name, payload.email);
      user = await userModel.create({
        userName,
        userEmail: payload.email,
        googleId: payload.sub,
        authProvider: "google",
        role: "user",
      });
    }

    setAuthCookie(res, user);
    res.status(200).json({
      message: "User logged in with Google",
      user: formatUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error while logging in with Google",
    });
  }
}
async function logoutUser(req, res) {
  res.clearCookie("token", cookieOptions);
  res.status(200).json({
    message: "User logged out ",
  });
}

async function getCurrentUser(req, res) {
  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user: formatUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Server error while fetching user",
    });
  }
}

module.exports = { registerUser, loginUser, googleLogin, logoutUser, getCurrentUser };
