const supertest = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

describe('User Registration', () => {
  beforeAll(async () => {
    await sequelize.sync();
  });

  beforeEach(async () => {
    await User.destroy({ truncate: true });
  });

  const userInput = {
    username: 'user1',
    email: 'user1@mail.com',
    password: 'P@ssw0rd1',
  };

  const postValidUser = () => {
    return supertest(app).post('/api/v1/users').send(userInput);
  };

  it('should return 200 OK when sign up request is valid', async () => {
    const response = await postValidUser();
    expect(response.status).toBe(200);
  });

  it('should return sucess message when signup request is valid', async () => {
    const response = await postValidUser();
    expect(response.body.msg).toBe('User register successfully');
  });

  it('should save the user to database', async () => {
    await postValidUser();

    const users = await User.findAll();

    expect(users.length).toBe(1);
    expect(users[0].username).toBe(userInput.username);
    expect(users[0].email).toBe(userInput.email);
  });

  it('should hash the password in database', async () => {
    await postValidUser();

    const users = await User.findAll();

    expect(users[0].password).not.toBe(userInput.password);
  });
});
