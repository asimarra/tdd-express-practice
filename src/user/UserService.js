const crypto = require('node:crypto');
const bcryp = require('bcrypt');
const User = require('./User');
const EmailService = require('../email/EmailService');
const sequelize = require('../config/database');
const InvalidTokenExeption = require('./InvalidTokenExeption');
const UserNotFoundException = require('./UserNotFoundException');

const save = async (userData) => {
  const { username, email, password } = userData;

  const hashedPassword = await bcryp.hash(password, 10);
  const activationToken = _generateToken();

  const transaction = await sequelize.transaction();
  try {
    await User.create(
      {
        username,
        email,
        password: hashedPassword,
        activationToken,
      },
      {
        transaction,
      }
    );
    await EmailService.sendAccountActivation(email, activationToken);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const _generateToken = (length = 16) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });
  if (!user) {
    throw new InvalidTokenExeption();
  }
  user.inactive = false;
  user.activationToken = null;
  return await user.save();
};

const getUsers = async (page) => {
  const pageSize = 10;
  const usersWithCount = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ['id', 'username', 'email'],
    limit: pageSize,
    offset: page * pageSize,
  });

  return {
    content: usersWithCount.rows,
    page,
    size: 10,
    totalPages: Math.ceil(usersWithCount.count / pageSize),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    attributes: ['id', 'username', 'email'],
    where: { id, inactive: false },
  });

  if (!user) {
    throw new UserNotFoundException();
  }

  return user;
};

module.exports = {
  save,
  findByEmail,
  activate,
  getUsers,
  getUser,
};
