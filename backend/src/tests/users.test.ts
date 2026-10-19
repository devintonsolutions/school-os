import {
  describe,
  it,
  expect,
  beforeAll,
} from "vitest";
import request from "supertest";
import app from "../app";
import { getTestStudentTokens, getTestAdminTokens } from "../utils/test-utils";

describe("Authentication", () => {
  let student: Awaited<ReturnType<typeof getTestStudentTokens>>["student"];
  let accessToken: string;
  let refreshToken: string;

  let adminAccessToken: string;
  let adminRefreshToken: string;

  beforeAll(async () => {
    const tokens = await getTestStudentTokens();

    student = tokens.student;
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;

    const adminTokens = await getTestAdminTokens();

    adminAccessToken = adminTokens.adminAccessToken
    adminRefreshToken = adminTokens.adminRefreshToken
  });

    it("fetching users for admin endpoint", async () => {
        const response = await request(app)
        .get("/api/v1/users/")
        .set({
            authorization : `Bearer ${adminAccessToken}`
        })

        expect(response.status).toBe(200)
    })

    it("changing user roles for admin endpoint", async () => {
        const response1 = await request(app)
        .patch(`/api/v1/users/${student.id}/role/`)
        .set({
            authorization : `Bearer ${adminAccessToken}`
        })
        .send({
            role:"TEACHER"
        })
        const response2 = await request(app)
        .patch(`/api/v1/users/${student.id}/role/`)
        .set({
            authorization : `Bearer ${adminAccessToken}`
        })
        .send({
            role:"STUDENT"
        })

        expect(response1.status).toBe(200)
        expect(response2.status).toBe(200)
    })
    it("changing user activity status for admin endpoint", async () => {
        const response1 = await request(app)
        .patch(`/api/v1/users/${student.id}/status/`)
        .set({
            authorization : `Bearer ${adminAccessToken}`
        })
        .send({
            isActive:false
        })
        const response2 = await request(app)
        .patch(`/api/v1/users/${student.id}/status/`)
        .set({
            authorization : `Bearer ${adminAccessToken}`
        })
        .send({
            isActive:true
        })

        expect(response1.status).toBe(200)
        expect(response2.status).toBe(200)
    })
});

