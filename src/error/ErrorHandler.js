module.exports = (error, req, res, _) => {
  const { status = 500, message = 'default_error_message', errors } = error;

  let validationErrors;
  if (errors) {
    validationErrors = {};
    errors.forEach((error) => {
      validationErrors[error.path] = req.t(error.msg);
    });
  }

  return res.status(status).send({
    path: req.originalUrl,
    timestamp: new Date().getTime(),
    message: req.t(message),
    validationErrors,
  });
};
