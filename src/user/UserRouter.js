const express = require('express');
const { validationResult, check, body } = require('express-validator');
const UserService = require('./UserService');
const router = express.Router();

router.post(
  '/api/1.0/users',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({
      min: 4,
      max: 32,
    })
    .withMessage('username_size'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const existEmail = await UserService.findByEmail(email);
      if (existEmail) {
        throw new Error('email_in_use');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = {};
      errors.array().forEach((error) => {
        validationErrors[error.path] = req.t(error.msg);
      });
      return res.status(400).send({
        validationErrors,
      });
    }

    await UserService.save(req.body);
    return res.status(200).json({ msg: req.t('user_register_success') });
  }
);

module.exports = router;
