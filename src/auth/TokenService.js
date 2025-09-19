const jwt = require('jsonwebtoken');

const createToken = async (user) => {
  return jwt.sign({ id: user.id }, 'Secret-Key123@@');
};

module.exports = {
  createToken,
};
