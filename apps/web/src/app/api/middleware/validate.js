/**
 * Input Validation Middleware
 * Uses Yup for schema validation
 */

import * as yup from "yup";
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from "@/app/api/utils/currencies";

/**
 * Create validation middleware for request body
 * @param {yup.ObjectSchema} schema - Yup validation schema
 * @param {object} options - Validation options
 * @param {boolean} options.strict - Use strict mode (default: false)
 * @param {boolean} options.abortEarly - Stop on first error (default: false)
 * @returns {Function} Hono middleware function
 */
export function validateBody(schema, options = {}) {
  const { strict = false, abortEarly = false } = options;

  return async (c, next) => {
    try {
      let body = {};
      
      // Try to parse JSON body
      try {
        const contentType = c.req.header("content-type") || "";
        if (contentType.includes("application/json")) {
          body = await c.req.json();
        } else {
          // Try form data
          const formData = await c.req.parseBody();
          if (formData && Object.keys(formData).length > 0) {
            body = formData;
          }
        }
      } catch (parseError) {
        return c.json(
          {
            ok: false,
            error: "invalid_json",
            message: "Invalid JSON in request body",
          },
          400
        );
      }

      // Validate with Yup
      const validated = await schema.validate(body, {
        strict,
        abortEarly,
        stripUnknown: true, // Remove unknown fields
      });

      // Store validated data in context
      c.set("validatedBody", validated);
      c.set("rawBody", body);

      await next();
    } catch (validationError) {
      if (validationError.name === "ValidationError") {
        const errors = {};
        if (validationError.inner && validationError.inner.length > 0) {
          validationError.inner.forEach((err) => {
            if (err.path) {
              errors[err.path] = err.message;
            }
          });
        } else if (validationError.path) {
          errors[validationError.path] = validationError.message;
        }

        return c.json(
          {
            ok: false,
            error: "validation_error",
            message: "Validation failed",
            details: {
              errors,
              summary: validationError.message,
            },
          },
          400
        );
      }

      // Re-throw unexpected errors
      throw validationError;
    }
  };
}

/**
 * Create validation middleware for query parameters
 * @param {yup.ObjectSchema} schema - Yup validation schema
 * @param {object} options - Validation options
 * @returns {Function} Hono middleware function
 */
export function validateQuery(schema, options = {}) {
  const { strict = false, abortEarly = false } = options;

  return async (c, next) => {
    try {
      const query = Object.fromEntries(c.req.query());
      
      // Validate with Yup
      const validated = await schema.validate(query, {
        strict,
        abortEarly,
        stripUnknown: true,
      });

      // Store validated query in context
      c.set("validatedQuery", validated);

      await next();
    } catch (validationError) {
      if (validationError.name === "ValidationError") {
        const errors = {};
        if (validationError.inner && validationError.inner.length > 0) {
          validationError.inner.forEach((err) => {
            if (err.path) {
              errors[err.path] = err.message;
            }
          });
        } else if (validationError.path) {
          errors[validationError.path] = validationError.message;
        }

        return c.json(
          {
            ok: false,
            error: "validation_error",
            message: "Query validation failed",
            details: {
              errors,
              summary: validationError.message,
            },
          },
          400
        );
      }

      throw validationError;
    }
  };
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // UUID validation
  uuid: yup.string().uuid("Invalid UUID format"),
  
  // Amount validation (positive number)
  amount: yup
    .number()
    .typeError("Amount must be a number")
    .positive("Amount must be greater than 0")
    .required("Amount is required"),
  
  // Currency code (East African currencies)
  currency: yup
    .string()
    .oneOf(SUPPORTED_CURRENCIES, `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`)
    .uppercase()
    .default(DEFAULT_CURRENCY),
  
  // Email validation
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required"),
  
  // Password validation (matches passwordValidation.js)
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be no more than 128 characters")
    .matches(/[A-Z]/, "Password must contain at least one uppercase letter")
    .matches(/[a-z]/, "Password must contain at least one lowercase letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .matches(/[^A-Za-z0-9]/, "Password must contain at least one special character")
    .required("Password is required"),
  
  // Optional string
  optionalString: yup.string().nullable().default(null),
  
  // Optional number
  optionalNumber: yup.number().nullable().default(null),
  
  // Date string (ISO format)
  dateString: yup
    .string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  
  // URL validation
  url: yup.string().url("Invalid URL format"),
  
  // Pagination schema
  pagination: yup.object({
    limit: yup
      .number()
      .integer()
      .min(1)
      .max(100)
      .default(20),
    cursor: yup
      .string()
      .nullable()
      .default(null),
  }),
};


