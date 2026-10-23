export function notFound(req, res) {
  res.status(404).json({ message: `Nothing here: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong on the server';
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    status = 409;
    message = `That ${Object.keys(err.keyPattern || { value: 1 }).join(', ')} is already registered`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'That request contains an invalid id';
  } else if (err.name === 'MulterError' || /file type/i.test(message)) {
    status = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'That file is larger than the 15 MB limit';
  }
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
}
