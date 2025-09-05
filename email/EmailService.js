const transporter = require('../src/config/emailTransporter');

const sendAccountActivation = async (email, token) => {
  return await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `Token is ${token}`,
  });
};

module.exports = { sendAccountActivation };
