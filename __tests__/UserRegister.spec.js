const supertest = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../config/database');

describe('User Registration', () => {
  const userInput = {
    username: 'user1',
    email: 'user1@mail.com',
    password: 'P@ssw0rd1',
  };

  beforeAll(() => {
    return sequelize.sync();
  });

  beforeEach(() => {
    User.destroy({ truncate: true });
  });

  it('should return 200 OK when sign up request is valid', async () => {
    const response = await supertest(app).post('/api/v1/users').send(userInput);
    expect(response.status).toBe(200);
  });

  it('should return sucess message when signup request is valid', async () => {
    const response = await supertest(app).post('/api/v1/users').send(userInput);
    expect(response.body.msg).toBe('User register successfully');
  });

  it('should save the user to database', async () => {
    await supertest(app).post('/api/v1/users').send(userInput);

    const users = await User.findAll();

    expect(users.length).toBe(1);
    expect(users[0].username).toBe(userInput.username);
    expect(users[0].email).toBe(userInput.email);
  });
});
