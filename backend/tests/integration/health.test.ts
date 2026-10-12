import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

describe("Backend Foundation Health & Routing Integration Tests", () => {
  const app = createApp();

  it("GET /health should return 200 with UP status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("UP");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("GET /api/v1/ should return operational message", async () => {
    const response = await request(app).get("/api/v1");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.version).toBe("1.0.0");
  });

  it("GET /unrecognized-endpoint should return 404 with standardized error envelope", async () => {
    const response = await request(app).get("/unrecognized-endpoint");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.message).toContain("not found");
  });
});
