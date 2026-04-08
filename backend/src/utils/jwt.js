const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../config");

const signAuthToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

const verifyAuthToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = {
  signAuthToken,
  verifyAuthToken,
};
