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

  const validUserInput = {
    username: 'user1',
    email: 'user1@mail.com',
    password: 'P@ssw0rd1',
  };

  const postValidUser = (user = validUserInput) => {
    return supertest(app).post('/api/v1/users').send(user);
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
    expect(users[0].username).toBe(validUserInput.username);
    expect(users[0].email).toBe(validUserInput.email);
  });

  it('should hash the password in database', async () => {
    await postValidUser();

    const users = await User.findAll();

    expect(users[0].password).not.toBe(validUserInput.password);
  });

  it('should return 400 when username is null', async () => {
    const response = await postValidUser({ ...validUserInput, username: null });

    expect(response.status).toBe(400);
  });

  it('should return validationErrors fields when validation error ocurrs', async () => {
    const response = await postValidUser({ ...validUserInput, username: null });
    expect(response.body.validationErrors).not.toBeUndefined();
  });

  it('should return "Username cannot be null" when username is null', async () => {
    const response = await postValidUser({ ...validUserInput, username: null });
    expect(response.body.validationErrors.username).toBe(
      'Username cannot be null'
    );
  });

  it('should return "Email cannot be null" when email is null', async () => {
    const response = await postValidUser({ ...validUserInput, email: null });
    expect(response.body.validationErrors.email).toBe('Email cannot be null');
  });

  it('should return an error for both when username and email are null', async () => {
    const response = await postValidUser({
      ...validUserInput,
      email: null,
      username: null,
    });

    expect(Object.keys(response.body.validationErrors)).toEqual([
      'username',
      'email',
    ]);
  });
});
