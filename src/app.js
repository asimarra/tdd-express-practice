const express = require('express');
const User = require('./user/User');
const bcryp = require('bcrypt');

const app = express();

app.use(express.json());

app.post('/api/v1/users', async (req, res) => {
  const userData = {
    ...req.body,
    password: await bcryp.hash(req.body.password, 10),
  };

  await User.create(userData);
  res.status(200).json({ msg: 'User register successfully' });
});

module.exports = app;
