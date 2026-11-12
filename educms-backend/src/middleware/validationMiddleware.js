const { validationResult } = require("express-validator");

// Check the results of request validation
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  // Continue if there are no validation errors
  if (errors.isEmpty()) {
    return next();
  }

  // Return all validation errors
  return res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
};

module.exports = { validateRequest };
