const express = require('express');
const UserService = require('./UserService');
const router = express.Router();

const validateUserName = (req, res, next) => {
  const userData = req.body;

  if (userData.username === null) {
    req.validationErrors = {
      username: 'Username cannot be null',
    };
  }

  next();
};

const validateEmail = (req, res, next) => {
  const userData = req.body;

  if (userData.email === null) {
    req.validationErrors = {
      ...req.validationErrors,
      email: 'Email cannot be null',
    };
  }

  next();
};

router.post(
  '/api/v1/users',
  validateUserName,
  validateEmail,
  async (req, res) => {
    if (req.validationErrors) {
      return res.status(400).send({
        validationErrors: { ...req.validationErrors },
      });
    }

    await UserService.save(req.body);
    return res.status(200).json({ msg: 'User register successfully' });
  }
);

module.exports = router;
