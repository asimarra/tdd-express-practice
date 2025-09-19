const express = require('express');
const bcrypt = require('bcrypt');
const { validationResult, check, body } = require('express-validator');
const UserService = require('./UserService');
const ValidationException = require('../error/ValidationException');
const ForbiddenException = require('../auth/ForbiddenException');
const basicAuthentication = require('../middleware/basicAuthentication');
const pagination = require('../middleware/pagination');
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

router.get('/api/1.0/users', pagination, async (req, res) => {
  const { page, size } = req.pagination;
  const users = await UserService.getUsers(page, size);
  return res.send(users);
});

router.get('/api/1.0/users/:id', async (req, res) => {
  const userId = req.params.id;
  const user = await UserService.getUser(userId);
  return res.send(user);
});

router.put('/api/1.0/users/:id', async (req, res) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');
    const user = await UserService.findByEmail(email);

    if (!user) {
      throw new ForbiddenException('unauthroized_user_update');
    }

    if (user.id !== +req.params.id) {
      throw new ForbiddenException('unauthroized_user_update');
    }

    if (user.inactive) {
      throw new ForbiddenException('unauthroized_user_update');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new ForbiddenException('unauthroized_user_update');
    }

    await UserService.updateUser(+req.params.id, req.body);

    return res.send();
  }
  throw new ForbiddenException('unauthroized_user_update');
});

module.exports = router;
