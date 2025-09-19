const jwt = require('jsonwebtoken');

const PRIVATE_KEY = 'Secret-Key123@@';

const createToken = (user) => {
  return jwt.sign({ id: user.id }, PRIVATE_KEY);
};

const verifyToken = async (token) => {
  return jwt.verify(token, PRIVATE_KEY);
};

module.exports = {
  createToken,
  verifyToken,
};
