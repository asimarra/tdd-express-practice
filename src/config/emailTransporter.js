const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: '127.0.0.1',
  port: 8587,
  tls: {
    rejectUnauthorized: false,
  },
});

module.exports = transporter;
