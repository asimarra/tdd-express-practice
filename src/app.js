const express = require('express');
const User = require('./user/User');

const app = express();

app.use(express.json());

app.post('/api/v1/users', async (req, res) => {
  await User.create(req.body);
  res.status(200).json({ msg: 'User register successfully' });
});

module.exports = app;
