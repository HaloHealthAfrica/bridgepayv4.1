/**
 * Integration Tests for Projects API
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../projects/route.js";
import { createMockRequest, createMockSession, expectSuccess, expectError } from "../../../test/utils/testHelpers.js";
import * as authModule from "@/auth";

// Mock auth module
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock sql module
vi.mock("@/app/api/utils/sql", () => ({
  default: vi.fn(),
}));

// Mock logger
vi.mock("@/app/api/utils/logger", () => ({
  startRequest: vi.fn(() => ({
    id: "test-request-id",
    header: () => ({}),
    end: vi.fn(),
  })),
}));

// Mock audit
vi.mock("@/app/api/utils/audit", () => ({
  writeAudit: vi.fn(),
}));

import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

describe("Projects API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/projects", () => {
    it("should return 401 for unauthenticated requests", async () => {
      auth.mockResolvedValue(null);

      const request = createMockRequest({
        method: "GET",
        url: "http://localhost/api/projects",
      });

      const response = await GET(request);
      const json = await expectError(response, "unauthorized", 401);

      expect(json.error).toBe("unauthorized");
    });

    it("should return projects for authenticated user", async () => {
      const session = createMockSession({ userId: "user-123" });
      auth.mockResolvedValue(session);

      const mockProjects = [
        {
          id: "project-1",
          user_id: "user-123",
          title: "Test Project",
          description: "Test Description",
          status: "active",
          current_amount: 1000,
          target_amount: 5000,
          currency: "KES",
          deadline: null,
          category: null,
          location: null,
          cover_image_url: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      sql.mockResolvedValue(mockProjects);

      const request = createMockRequest({
        method: "GET",
        url: "http://localhost/api/projects",
      });

      const response = await GET(request);
      const json = await expectSuccess(response);

      expect(json.ok).toBe(true);
      expect(json.items).toBeDefined();
      expect(Array.isArray(json.items)).toBe(true);
    });

    it("should filter by status", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      sql.mockResolvedValue([]);

      const request = createMockRequest({
        method: "GET",
        url: "http://localhost/api/projects?status=active",
      });

      const response = await GET(request);
      await expectSuccess(response);

      // Verify SQL was called with status filter
      expect(sql).toHaveBeenCalled();
      const sqlCall = sql.mock.calls[0];
      expect(sqlCall[0]).toContain("status =");
    });

    it("should search by query", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      sql.mockResolvedValue([]);

      const request = createMockRequest({
        method: "GET",
        url: "http://localhost/api/projects?q=test",
      });

      const response = await GET(request);
      await expectSuccess(response);

      expect(sql).toHaveBeenCalled();
    });

    it("should reject invalid status filter", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest({
        method: "GET",
        url: "http://localhost/api/projects?status=invalid",
      });

      const response = await GET(request);
      const json = await expectError(response, "invalid_input", 400);

      expect(json.message).toBeDefined();
    });
  });

  describe("POST /api/projects", () => {
    it("should return 401 for unauthenticated requests", async () => {
      auth.mockResolvedValue(null);

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost/api/projects",
        body: { title: "Test", target_amount: 1000 },
      });

      const response = await POST(request);
      await expectError(response, "unauthorized", 401);
    });

    it("should create project with valid data", async () => {
      const session = createMockSession({ userId: "user-123" });
      auth.mockResolvedValue(session);

      const mockProject = {
        id: "project-1",
        user_id: "user-123",
        title: "Test Project",
        description: "Test Description",
        status: "draft",
        target_amount: 5000,
        currency: "KES",
        current_amount: 0,
        deadline: null,
        category: null,
        location: null,
        cover_image_url: null,
        created_at: new Date(),
      };

      sql.mockResolvedValue([mockProject]);

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost/api/projects",
        body: {
          title: "Test Project",
          description: "Test Description",
          target_amount: 5000,
          currency: "KES",
        },
      });

      const response = await POST(request);
      const json = await expectSuccess(response, 200);

      expect(json.ok).toBe(true);
      expect(json.id).toBe("project-1");
      expect(json.title).toBe("Test Project");
    });

    it("should reject invalid title", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost/api/projects",
        body: {
          title: "AB", // Too short
          target_amount: 1000,
        },
      });

      const response = await POST(request);
      const json = await expectError(response, "validation_error", 400);

      expect(json.details).toBeDefined();
      expect(json.details.errors).toBeDefined();
    });

    it("should reject negative target amount", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost/api/projects",
        body: {
          title: "Valid Title",
          target_amount: -100,
        },
      });

      const response = await POST(request);
      const json = await expectError(response, "validation_error", 400);

      expect(json.details.errors).toBeDefined();
    });

    it("should reject invalid JSON", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      const request = new Request("http://localhost/api/projects", {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      await expectError(response, "invalid_json", 400);
    });

    it("should validate deadline is in future", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      const pastDate = new Date("2020-01-01");

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost/api/projects",
        body: {
          title: "Valid Title",
          target_amount: 1000,
          deadline: pastDate.toISOString(),
        },
      });

      const response = await POST(request);
      const json = await expectError(response, "validation_error", 400);

      expect(json.details.errors).toBeDefined();
    });

    it("should validate cover image URL format", async () => {
      const session = createMockSession();
      auth.mockResolvedValue(session);

      const request = createMockRequest({
        method: "POST",
        url: "http://localhost/api/projects",
        body: {
          title: "Valid Title",
          target_amount: 1000,
          cover_image_url: "not-a-valid-url",
        },
      });

      const response = await POST(request);
      const json = await expectError(response, "validation_error", 400);

      expect(json.details.errors).toBeDefined();
    });
  });
});

