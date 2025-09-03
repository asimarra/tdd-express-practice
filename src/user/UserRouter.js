const express = require('express');
const UserService = require('./UserService');
const router = express.Router();

router.post('/api/v1/users', async (req, res) => {
  await UserService.save(req.body);

  res.status(200).json({ msg: 'User register successfully' });
});

module.exports = router;
