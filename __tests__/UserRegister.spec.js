const supertest = require('supertest');
const { SMTPServer } = require('smtp-server');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }

        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(8587, '127.0.0.1');

  await sequelize.sync();
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

const validUserInput = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'P@ssw0rd1',
};

const postValidUser = (user = validUserInput, options = {}) => {
  const request = supertest(app).post('/api/1.0/users');
  if (options.language) {
    request.set('Accept-Language', options.language);
  }
  return request.send(user);
};

describe('User Registration', () => {
  it('should return 200 OK when sign up request is valid', async () => {
    const response = await postValidUser();
    expect(response.status).toBe(200);
  });

  it(`should return ${en.user_register_success} when signup request is valid`, async () => {
    const response = await postValidUser();
    expect(response.body.message).toBe(en.user_register_success);
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

  it.each([
    { field: 'username', value: null, expected: en.username_null },
    {
      field: 'username',
      value: 'usr',
      expected: en.username_size,
    },
    {
      field: 'username',
      value: 'usr'.repeat(33),
      expected: en.username_size,
    },
    { field: 'email', value: null, expected: en.email_null },
    { field: 'email', value: 'email.com', expected: en.email_invalid },
    { field: 'email', value: 'user@com', expected: en.email_invalid },
    { field: 'password', value: null, expected: en.password_null },
    {
      field: 'password',
      value: 'P4ss',
      expected: en.password_size,
    },
    {
      field: 'password',
      value: 'lowercase',
      expected: en.password_pattern,
    },
    {
      field: 'password',
      value: 'UPPERCASE',
      expected: en.password_pattern,
    },
    {
      field: 'password',
      value: '123331111',
      expected: en.password_pattern,
    },
  ])(
    'should return "$expected" when $field is $value',
    async ({ field, value, expected }) => {
      const input = {
        ...validUserInput,
        [field]: value,
      };
      const response = await postValidUser(input);
      expect(response.body.validationErrors[field]).toBe(expected);
    }
  );

  it(`should return ${en.email_in_use} when same email is already in use`, async () => {
    await postValidUser();
    const response = await postValidUser();
    expect(response.body.validationErrors.email).toBe(en.email_in_use);
  });

  it('should return error for both username is null and email is in use', async () => {
    await postValidUser();
    const response = await postValidUser({
      ...validUserInput,
      username: null,
    });
    expect(Object.keys(response.body.validationErrors)).toEqual([
      'username',
      'email',
    ]);
  });

  it('should create user in inactive mode', async () => {
    await postValidUser();
    const addedUser = await User.findOne();
    expect(addedUser.inactive).toBeTruthy();
  });

  it('should create user in inactive mode even if the request body contains inactive as false', async () => {
    await postValidUser({ ...validUserInput, inactive: false });
    const addedUser = await User.findOne();
    expect(addedUser.inactive).toBeTruthy();
  });

  it('should create an activation token for user', async () => {
    await postValidUser();
    const addedUser = await User.findOne();
    expect(addedUser.activationToken).toBeTruthy();
  });

  it('should send an account activation email with activation token', async () => {
    await postValidUser();
    const addedUser = await User.findOne();
    expect(lastMail).toContain(validUserInput.email);
    expect(lastMail).toContain(addedUser.activationToken);
  });

  it('should return 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postValidUser();
    expect(response.status).toBe(502);
  });

  it(`should return "${en.user_register_fail}" message when sending email fails`, async () => {
    simulateSmtpFailure = true;
    const response = await postValidUser();
    expect(response.body.message).toBe(en.user_register_fail);
  });

  it('should not save the user to database if activation mail fails', async () => {
    simulateSmtpFailure = true;
    await postValidUser();

    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it(`should return ${en.validation_failure} message in error response body when validation fails`, async () => {
    const response = await postValidUser({ ...validUserInput, username: null });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  const options = { language: 'es' };

  it(`should return ${es.user_register_success} when signup request is valid and language is set as Spanish`, async () => {
    const response = await postValidUser({ ...validUserInput }, options);
    expect(response.body.message).toBe(es.user_register_success);
  });

  it.each([
    { field: 'username', value: null, expected: es.username_null },
    {
      field: 'username',
      value: 'usr',
      expected: es.username_size,
    },
    {
      field: 'username',
      value: 'usr'.repeat(33),
      expected: es.username_size,
    },
    { field: 'email', value: null, expected: es.email_null },
    { field: 'email', value: 'email.com', expected: es.email_invalid },
    { field: 'email', value: 'user@com', expected: es.email_invalid },
    { field: 'password', value: null, expected: es.password_null },
    {
      field: 'password',
      value: 'P4ss',
      expected: es.password_size,
    },
    {
      field: 'password',
      value: 'lowercase',
      expected: es.password_pattern,
    },
    {
      field: 'password',
      value: 'UPPERCASE',
      expected: es.password_pattern,
    },
    {
      field: 'password',
      value: '123331111',
      expected: es.password_pattern,
    },
  ])(
    'should return "$expected" when $field is $value when language is set as Spanish',
    async ({ field, value, expected }) => {
      const input = {
        ...validUserInput,
        [field]: value,
      };
      const response = await postValidUser(input, options);
      expect(response.body.validationErrors[field]).toBe(expected);
    }
  );

  it(`should return ${es.email_in_use} when same email is already in use when language is set as Spanish`, async () => {
    await postValidUser();
    const response = await postValidUser({ ...validUserInput }, options);
    expect(response.body.validationErrors.email).toBe(es.email_in_use);
  });

  it(`should return "${es.user_register_fail}" message when sending email fails using the Spanish language`, async () => {
    simulateSmtpFailure = true;
    const response = await postValidUser({ ...validUserInput }, options);
    expect(response.body.message).toBe(es.user_register_fail);
  });

  it(`should return ${es.validation_failure} message in error response body when validation fails using the Spanish language`, async () => {
    const response = await postValidUser(
      { ...validUserInput, username: null },
      options
    );
    expect(response.body.message).toBe(es.validation_failure);
  });
});

describe('Account activation', () => {
  it('should activate the account when correct token is sent', async () => {
    await postValidUser();

    let addedUser = await User.findOne();
    const token = addedUser.activationToken;

    await supertest(app).post(`/api/1.0/users/token/${token}`).send();
    let activatedUser = await User.findOne();
    expect(activatedUser.inactive).toBeFalsy();
  });

  it('should removes the token from user table after sucessful activation', async () => {
    await postValidUser();

    let addedUser = await User.findOne();
    const token = addedUser.activationToken;

    await supertest(app).post(`/api/1.0/users/token/${token}`).send();
    let activatedUser = await User.findOne();
    expect(activatedUser.activationToken).toBeFalsy();
  });

  it('should not activate the account when the token is wrong', async () => {
    await postValidUser();

    await supertest(app).post('/api/1.0/users/token/wrong-token').send();

    let user = await User.findOne();
    expect(user.inactive).toBeTruthy();
  });

  it('should return bad response when the token is wrong', async () => {
    await postValidUser();

    const response = await supertest(app)
      .post('/api/1.0/users/token/wrong-token')
      .send();
    expect(response.status).toBe(400);
  });

  it.each([
    {
      language: 'en',
      tokenStatus: 'wrong',
      message: en.account_activation_failure,
    },
    {
      language: 'es',
      tokenStatus: 'wrong',
      message: es.account_activation_failure,
    },
    {
      language: 'en',
      tokenStatus: 'success',
      message: en.account_activation_success,
    },
    {
      language: 'es',
      tokenStatus: 'success',
      message: es.account_activation_success,
    },
  ])(
    'should return "$message" when wrong token is sent and language is $language',
    async ({ language, tokenStatus, message }) => {
      await postValidUser();

      let token = 'wrong-token';
      if (tokenStatus === 'success') {
        let addedUser = await User.findOne();
        token = addedUser.activationToken;
      }

      const response = await supertest(app)
        .post(`/api/1.0/users/token/${token}`)
        .set('Accept-Language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('should return path, timestamp, message and validationErrors in response when validation failure', async () => {
    const response = await postValidUser({ ...validUserInput, username: null });
    expect(Object.keys(response.body)).toEqual([
      'path',
      'timestamp',
      'message',
      'validationErrors',
    ]);
  });

  it('should return path, timestamp and message in response when request fails other than validation error', async () => {
    const response = await supertest(app)
      .post('/api/1.0/users/token/wrong-token')
      .send();
    expect(Object.keys(response.body)).toEqual([
      'path',
      'timestamp',
      'message',
    ]);
  });

  it('should return path in error body', async () => {
    const response = await supertest(app)
      .post('/api/1.0/users/token/wrong-token')
      .send();
    expect(response.body.path).toEqual('/api/1.0/users/token/wrong-token');
  });

  it('should return timestamp in error body', async () => {
    const response = await supertest(app)
      .post('/api/1.0/users/token/wrong-token')
      .send();
    expect(response.body.timestamp).toBeTruthy();
  });
});
