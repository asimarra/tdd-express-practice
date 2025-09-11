const express = require('express');
const { validationResult, check, body } = require('express-validator');
const UserService = require('./UserService');
const ValidationException = require('../error/ValidationException');
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
      throw new ValidationException(errors.array());
    }

    try {
      await UserService.save(req.body);
      return res.status(200).json({ message: req.t('user_register_success') });
    } catch (error) {
      return res.status(502).send({ message: req.t('user_register_fail') });
    }
  }
);

router.post('/api/1.0/users/token/:token', async (req, res) => {
  const token = req.params.token;
  await UserService.activate(token);
  return res.send({ message: req.t('account_activation_success') });
});

router.get('/api/1.0/users', async (req, res) => {
  const users = await UserService.getUsers(req.query.page);
  return res.send(users);
});

module.exports = router;
