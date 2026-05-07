import Joi from 'joi';
import { validateRequest as baseValidate } from './auth.validation.js';

export const createWorkshopSchema = Joi.object({
  title: Joi.string().required().min(3).max(255),
  description: Joi.string().optional().allow(null, ''),
  speaker: Joi.string().optional().allow(null, ''),
  date: Joi.string().optional().allow(null, ''),
  start_time: Joi.string().optional().allow(null, ''),
  end_time: Joi.string().optional().allow(null, ''),
  totalSeats: Joi.number().integer().min(1).optional(),
  fee: Joi.number().min(0).optional(),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'CANCELLED').optional(),
  room_id: Joi.string().guid({ version: ['uuidv4'] }).optional()
}).strict();

export const updateWorkshopSchema = Joi.object({
  title: Joi.string().optional().min(3).max(255),
  description: Joi.string().optional().allow(null, ''),
  speaker: Joi.string().optional().allow(null, ''),
  start_time: Joi.string().optional().allow(null, ''),
  end_time: Joi.string().optional().allow(null, ''),
  totalSeats: Joi.number().integer().min(1).optional(),
  fee: Joi.number().min(0).optional(),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'CANCELLED').optional(),
  room_id: Joi.string().guid({ version: ['uuidv4'] }).optional()
}).strict();

export function validateRequest(schema) {
  return baseValidate(schema);
}

export default { createWorkshopSchema, updateWorkshopSchema, validateRequest };
