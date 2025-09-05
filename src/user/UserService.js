const crypto = require('node:crypto');
const bcryp = require('bcrypt');
const User = require('./User');
const EmailService = require('../../email/EmailService');

const save = async (userData) => {
  const { username, email, password } = userData;

  const hashedPassword = await bcryp.hash(password, 10);
  const activationToken = _generateToken();

  await User.create({
    username,
    email,
    password: hashedPassword,
    activationToken,
  });

  return EmailService.sendAccountActivation(email, activationToken);
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const _generateToken = (length = 16) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

module.exports = {
  save,
  findByEmail,
};
