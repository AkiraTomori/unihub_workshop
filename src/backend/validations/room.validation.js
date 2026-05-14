import Joi from 'joi';
import { validateRequest as baseValidate } from './auth.validation.js';

export const createRoomSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(1)
    .max(100)
    .trim()
    .messages({
      'string.base': 'Room name must be a string',
      'string.empty': 'Room name is required',
      'string.min': 'Room name cannot be empty',
      'string.max': 'Room name must not exceed 100 characters',
      'any.required': 'Room name is required',
    }),
  base_capacity: Joi.number()
    .required()
    .integer()
    .min(1)
    .messages({
      'number.base': 'Base capacity must be a number',
      'number.integer': 'Base capacity must be an integer',
      'number.min': 'Base capacity must be at least 1',
      'any.required': 'Base capacity is required',
    }),
  map_image_url: Joi.string()
    .optional()
    .allow(null, '')
    .max(255)
    .uri()
    .messages({
      'string.uri': 'Map image URL must be a valid URI',
      'string.max': 'Map image URL must not exceed 255 characters',
    }),
}).strict();

export const updateRoomSchema = Joi.object({
  name: Joi.string()
    .optional()
    .min(1)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Room name cannot be empty',
      'string.max': 'Room name must not exceed 100 characters',
    }),
  base_capacity: Joi.number()
    .optional()
    .integer()
    .min(1)
    .messages({
      'number.integer': 'Base capacity must be an integer',
      'number.min': 'Base capacity must be at least 1',
    }),
  map_image_url: Joi.string()
    .optional()
    .allow(null, '')
    .max(255)
    .uri()
    .messages({
      'string.uri': 'Map image URL must be a valid URI',
      'string.max': 'Map image URL must not exceed 255 characters',
    }),
}).strict();

export function validateRequest(schema) {
  return baseValidate(schema);
}

export default {
  createRoomSchema,
  updateRoomSchema,
  validateRequest,
};
