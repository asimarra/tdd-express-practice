const bcryp = require('bcrypt');
const User = require('./User');

const save = async (userData) => {
  const hashedPassword = await bcryp.hash(userData.password, 10);

  await User.create({
    ...userData,
    password: hashedPassword,
  });
};

module.exports = {
  save,
};
