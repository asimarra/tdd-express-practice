const supertest = require('supertest');
const { SMTPServer } = require('smtp-server');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

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
  const username_null = 'Username cannot be null';
  const username_size = 'Username must have min 4 and max 32 characters';
  const email_null = 'Email cannot be null';
  const email_invalid = 'Email is not valid';
  const email_in_use = 'Email already in use';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 characters';
  const password_pattern =
    'Password must have at least 1 uppercase, 1 lowercase letter and 1 number';
  const user_register_success = 'User register successfully';
  const user_register_fail = 'User register failed';

  it('should return 200 OK when sign up request is valid', async () => {
    const response = await postValidUser();
    expect(response.status).toBe(200);
  });

  it(`should return ${user_register_success} when signup request is valid`, async () => {
    const response = await postValidUser();
    expect(response.body.message).toBe(user_register_success);
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
    { field: 'username', value: null, expected: username_null },
    {
      field: 'username',
      value: 'usr',
      expected: username_size,
    },
    {
      field: 'username',
      value: 'usr'.repeat(33),
      expected: username_size,
    },
    { field: 'email', value: null, expected: email_null },
    { field: 'email', value: 'email.com', expected: email_invalid },
    { field: 'email', value: 'user@com', expected: email_invalid },
    { field: 'password', value: null, expected: password_null },
    {
      field: 'password',
      value: 'P4ss',
      expected: password_size,
    },
    {
      field: 'password',
      value: 'lowercase',
      expected: password_pattern,
    },
    {
      field: 'password',
      value: 'UPPERCASE',
      expected: password_pattern,
    },
    {
      field: 'password',
      value: '123331111',
      expected: password_pattern,
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

  it(`should return ${email_in_use} when same email is already in use`, async () => {
    await postValidUser();
    const response = await postValidUser();
    expect(response.body.validationErrors.email).toBe(email_in_use);
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

  it(`should return "${user_register_fail}" message when sending email fails`, async () => {
    simulateSmtpFailure = true;
    const response = await postValidUser();
    expect(response.body.message).toBe(user_register_fail);
  });

  it('should not save the user to database if activation mail fails', async () => {
    simulateSmtpFailure = true;
    await postValidUser();

    const users = await User.findAll();
    expect(users.length).toBe(0);
  });
});

describe('Internationalization', () => {
  const options = { language: 'es' };
  const username_null = 'El nombre de usuario no puede estar vacío';
  const username_size =
    'El nombre de usuario debe tener entre 4 y 32 caracteres';
  const email_null = 'El correo electrónico no puede estar vacío';
  const email_invalid = 'El correo electrónico no es válido';
  const email_in_use = 'El correo electrónico ya está en uso';
  const password_null = 'La contraseña no puede estar vacía';
  const password_size = 'La contraseña debe tener al menos 6 caracteres';
  const password_pattern =
    'La contraseña debe tener al menos 1 letra mayúscula, 1 letra minúscula y 1 número';
  const user_register_success = 'El usuario ha sido registrado exitosamente';
  const user_register_fail = 'Error al registrar usuario';

  it(`should return ${user_register_success} when signup request is valid and language is set as Spanish`, async () => {
    const response = await postValidUser({ ...validUserInput }, options);
    expect(response.body.message).toBe(user_register_success);
  });

  it.each([
    { field: 'username', value: null, expected: username_null },
    {
      field: 'username',
      value: 'usr',
      expected: username_size,
    },
    {
      field: 'username',
      value: 'usr'.repeat(33),
      expected: username_size,
    },
    { field: 'email', value: null, expected: email_null },
    { field: 'email', value: 'email.com', expected: email_invalid },
    { field: 'email', value: 'user@com', expected: email_invalid },
    { field: 'password', value: null, expected: password_null },
    {
      field: 'password',
      value: 'P4ss',
      expected: password_size,
    },
    {
      field: 'password',
      value: 'lowercase',
      expected: password_pattern,
    },
    {
      field: 'password',
      value: 'UPPERCASE',
      expected: password_pattern,
    },
    {
      field: 'password',
      value: '123331111',
      expected: password_pattern,
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

  it(`should return ${email_in_use} when same email is already in use when language is set as Spanish`, async () => {
    await postValidUser();
    const response = await postValidUser({ ...validUserInput }, options);
    expect(response.body.validationErrors.email).toBe(email_in_use);
  });

  it(`should return "${user_register_fail}" message when sending email fails`, async () => {
    simulateSmtpFailure = true;
    const response = await postValidUser({ ...validUserInput }, options);
    expect(response.body.message).toBe(user_register_fail);
  });
});
