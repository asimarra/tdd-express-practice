const nodemailer = require('nodemailer');
const transporter = require('../src/config/emailTransporter');

const sendAccountActivation = async (email, token) => {
  const response = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `
      <b>Please click below link to activate your account</b>
      <br/>
      <a href="http://localhost:8080/#/login?token=${token}">Activate</a>
      Token is ${token}
    `,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('url: ' + nodemailer.getTestMessageUrl(response));
  }

  return response;
};

module.exports = { sendAccountActivation };
