const TokenService = require('../auth/TokenService');

module.exports = async (req, _, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    try {
      const token = authorization.substring(7);
      const user = await TokenService.verifyToken(token);
      req.authenticatedUser = user;
    } catch (error) {}
  }
  next();
};
