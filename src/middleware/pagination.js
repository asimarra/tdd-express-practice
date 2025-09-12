const pagination = (req, res, next) => {
  const pageAsNumber = +req.query.page;
  const sizeAsNumber = +req.query.size;

  const page = Number.isNaN(pageAsNumber) ? 0 : Math.max(0, pageAsNumber ?? 0);
  let size = Number.isNaN(sizeAsNumber) ? 10 : sizeAsNumber;
  size = size > 10 || size < 1 ? 10 : size;

  req.pagination = { page, size };

  next();
};

module.exports = pagination;
