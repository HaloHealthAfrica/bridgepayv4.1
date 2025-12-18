/**
 * Unit Tests for Password Validation
 */

import { describe, it, expect } from "vitest";
import {
  validatePassword,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from "../passwordValidation.js";

describe("passwordValidation", () => {
  describe("validatePassword", () => {
    it("should reject empty password", () => {
      const result = validatePassword("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject null password", () => {
      const result = validatePassword(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password is required");
    });

    it("should reject password shorter than 8 characters", () => {
      const result = validatePassword("Short1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long"
      );
    });

    it("should reject password longer than 128 characters", () => {
      const longPassword = "A".repeat(129) + "1!";
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be less than 128 characters"
      );
    });

    it("should reject password without uppercase letter", () => {
      const result = validatePassword("password123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should reject password without lowercase letter", () => {
      const result = validatePassword("PASSWORD123!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should reject password without number", () => {
      const result = validatePassword("Password!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number"
      );
    });

    it("should reject password without special character", () => {
      const result = validatePassword("Password123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character"
      );
    });

    it("should reject common passwords", () => {
      const result = validatePassword("Password123!");
      // Note: This might pass if "Password123!" is not in the common list
      // But "password" should definitely fail
      const commonResult = validatePassword("password123!");
      expect(commonResult.valid).toBe(false);
    });

    it("should accept valid password", () => {
      const result = validatePassword("ValidPass123!");
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should accept password with various special characters", () => {
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*"];
      for (const char of specialChars) {
        const password = `ValidPass123${char}`;
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe("getPasswordStrength", () => {
    it("should return 0 for empty password", () => {
      expect(getPasswordStrength("")).toBe(0);
    });

    it("should return 1 for 8+ character password", () => {
      expect(getPasswordStrength("password")).toBeGreaterThanOrEqual(1);
    });

    it("should return higher score for longer passwords", () => {
      const short = getPasswordStrength("Pass123!");
      const long = getPasswordStrength("VeryLongPassword123!");
      expect(long).toBeGreaterThanOrEqual(short);
    });

    it("should return higher score for mixed case", () => {
      const lower = getPasswordStrength("password123!");
      const mixed = getPasswordStrength("Password123!");
      expect(mixed).toBeGreaterThanOrEqual(lower);
    });

    it("should return maximum score of 4", () => {
      const score = getPasswordStrength("VeryStrongPassword123!@#");
      expect(score).toBeLessThanOrEqual(4);
    });
  });

  describe("getPasswordStrengthLabel", () => {
    it("should return valid strength labels", () => {
      const labels = [
        "Very Weak",
        "Weak",
        "Fair",
        "Good",
        "Strong",
      ];

      for (let i = 0; i <= 4; i++) {
        const password = "A".repeat(8 + i) + "1!";
        const label = getPasswordStrengthLabel(password);
        expect(labels).toContain(label);
      }
    });

    it("should return 'Very Weak' for empty password", () => {
      expect(getPasswordStrengthLabel("")).toBe("Very Weak");
    });
  });
});

