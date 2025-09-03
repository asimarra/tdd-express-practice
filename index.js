const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize
  .sync()
  .then(() => {
    console.log('Connected to the database.');

    app.listen(3000, () => {
      console.log('Server is running on port 3000');
    });
  })
  .catch((error) => console.error(error));
