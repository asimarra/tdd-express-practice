const express = require('express');
const { validationResult, check, body } = require('express-validator');
const UserService = require('./UserService');
const router = express.Router();

router.post(
  '/api/v1/users',
  check('username').notEmpty().withMessage('Username cannot be null'),
  check('email').notEmpty().withMessage('Email cannot be null'),
  check('password').notEmpty().withMessage('Password cannot be null'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((error) => {
        validationErrors[error.path] = error.msg;
      });
      return res.status(400).send({
        validationErrors,
      });
    }

    await UserService.save(req.body);
    return res.status(200).json({ msg: 'User register successfully' });
  }
);

module.exports = router;
