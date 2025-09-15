const express = require('express');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');
const UserService = require('../user/UserService');
const AuthenticationException = require('./AuthenticationException');
const ForbiddenException = require('./ForbiddenException');
const router = express.Router();

router.post('/api/1.0/auth', check('email').isEmail(), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AuthenticationException();
  }

  const { email, password } = req.body;
  const user = await UserService.findByEmail(email);

  if (!user) {
    throw new AuthenticationException();
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AuthenticationException();
  }

  if (user.inactive) {
    throw new ForbiddenException();
  }

  res.send({
    id: user.id,
    username: user.username,
  });
});

module.exports = router;
