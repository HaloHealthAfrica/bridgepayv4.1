/**
 * Unit Tests for Error Handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
  handleValidationError,
  handleUnexpectedError,
} from "../errorHandler.js";

describe("errorHandler", () => {
  describe("errorResponse", () => {
    it("should create error response with error code", async () => {
      const response = errorResponse(ErrorCodes.UNAUTHORIZED);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.ok).toBe(false);
      expect(json.error).toBe("unauthorized");
    });

    it("should include custom message", async () => {
      const response = errorResponse(ErrorCodes.INVALID_INPUT, {
        message: "Custom error message",
      });
      const json = await response.json();

      expect(json.message).toBe("Custom error message");
    });

    it("should include details", async () => {
      const response = errorResponse(ErrorCodes.VALIDATION_ERROR, {
        details: { field: "value" },
      });
      const json = await response.json();

      expect(json.details).toEqual({ field: "value" });
    });

    it("should use custom status code", async () => {
      const response = errorResponse(ErrorCodes.SERVER_ERROR, {
        status: 503,
      });
      expect(response.status).toBe(503);
    });

    it("should map error codes to correct status codes", async () => {
      const testCases = [
        [ErrorCodes.UNAUTHORIZED, 401],
        [ErrorCodes.FORBIDDEN, 403],
        [ErrorCodes.NOT_FOUND, 404],
        [ErrorCodes.VALIDATION_ERROR, 400],
        [ErrorCodes.SERVER_ERROR, 500],
        [ErrorCodes.TIMEOUT, 504],
      ];

      for (const [code, expectedStatus] of testCases) {
        const response = errorResponse(code);
        expect(response.status).toBe(expectedStatus);
      }
    });
  });

  describe("successResponse", () => {
    it("should create success response", async () => {
      const response = successResponse({ data: "test" });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.data).toBe("test");
    });

    it("should use custom status code", async () => {
      const response = successResponse({}, 201);
      expect(response.status).toBe(201);
    });

    it("should include headers", async () => {
      const response = successResponse({}, 200, {
        "X-Custom": "value",
      });
      expect(response.headers.get("X-Custom")).toBe("value");
    });
  });

  describe("withErrorHandling", () => {
    it("should return successful response", async () => {
      const handler = withErrorHandling(async () => {
        return successResponse({ data: "test" });
      });

      const response = await handler();
      const json = await response.json();

      expect(json.ok).toBe(true);
      expect(json.data).toBe("test");
    });

    it("should catch and handle errors", async () => {
      const handler = withErrorHandling(async () => {
        throw new Error("Test error");
      });

      const response = await handler();
      const json = await response.json();

      expect(json.ok).toBe(false);
      expect(json.error).toBe("server_error");
    });

    it("should handle validation errors", async () => {
      const validationError = {
        name: "ValidationError",
        message: "Validation failed",
        path: "field",
      };

      const handler = withErrorHandling(async () => {
        throw validationError;
      });

      const response = await handler();
      const json = await response.json();

      expect(json.ok).toBe(false);
      expect(json.error).toBe("validation_error");
    });

    it("should pass through Response objects", async () => {
      const customResponse = new Response("Custom", { status: 418 });

      const handler = withErrorHandling(async () => {
        return customResponse;
      });

      const response = await handler();
      expect(response.status).toBe(418);
    });
  });

  describe("handleValidationError", () => {
    it("should format Yup validation errors", async () => {
      const validationError = {
        name: "ValidationError",
        message: "Validation failed",
        inner: [
          { path: "field1", message: "Field1 is required" },
          { path: "field2", message: "Field2 is invalid" },
        ],
      };

      const response = handleValidationError(validationError);
      const json = await response.json();

      expect(json.error).toBe("validation_error");
      expect(json.details.errors).toEqual({
        field1: "Field1 is required",
        field2: "Field2 is invalid",
      });
    });

    it("should handle single field errors", async () => {
      const validationError = {
        name: "ValidationError",
        message: "Field is required",
        path: "field",
      };

      const response = handleValidationError(validationError);
      const json = await response.json();

      expect(json.details.errors).toEqual({
        field: "Field is required",
      });
    });
  });

  describe("handleUnexpectedError", () => {
    it("should hide error details in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Internal error");
      const response = handleUnexpectedError(error);
      const json = await response.json();

      expect(json.error).toBe("server_error");
      expect(json.message).toBe("An unexpected error occurred");
      expect(json.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it("should show error details in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Internal error");
      const response = handleUnexpectedError(error);
      const json = await response.json();

      expect(json.details).toBeDefined();
      expect(json.details.name).toBe("Error");
      expect(json.details.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});

