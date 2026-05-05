import Joi from 'joi';

/**
 * Schema for user login
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Email must be valid',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .min(6)
    .max(255)
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password must not exceed 255 characters',
      'any.required': 'Password is required',
    }),
}).strict();

/**
 * Schema for user registration
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .messages({
      'string.email': 'Email must be valid',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .min(6)
    .max(255)
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required',
    }),
  full_name: Joi.string()
    .required()
    .min(2)
    .max(255)
    .messages({
      'string.base': 'Full name must be a string',
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'any.required': 'Full name is required',
    }),
  student_code: Joi.string()
    .optional()
    .allow(null)
    .max(50),
}).strict();

/**
 * Schema for refresh token
 */
export const refreshSchema = Joi.object({
  // Empty schema - token comes from cookie
}).strict();

/**
 * Validation middleware factory
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const messages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        status: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: messages,
      });
    }

    req.validatedData = value;
    return next();
  };
}

export default {
  loginSchema,
  registerSchema,
  refreshSchema,
  validateRequest,
};
