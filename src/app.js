const express = require('express');
const userRouter = require('./user/UserRouter');
const i18next = require('i18next');
const i18nextFsBackend = require('i18next-fs-backend');
const i18nextHttpMiddleware = require('i18next-http-middleware');
const ErrorHandler = require('./error/ErrorHandler');

i18next
  .use(i18nextFsBackend)
  .use(i18nextHttpMiddleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

const app = express();

app.use(i18nextHttpMiddleware.handle(i18next));

app.use(express.json());

app.use(userRouter);

app.use(ErrorHandler);

module.exports = app;
