import {
  describe,
  it,
  expect,
  beforeAll,
} from "vitest";
import request from "supertest";
import app from "../app";
import { getTestStudentTokens } from "../utils/test-utils";

describe("Authentication", () => {
  let student: Awaited<ReturnType<typeof getTestStudentTokens>>["student"];
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const tokens = await getTestStudentTokens();

    student = tokens.student;
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  });

    it("testing signup endpoint",async ()=>{
        const uniqueEmail = `student.test.${crypto.randomUUID()}@schoolos.com`
        const response = await request(app)
        .post('/api/v1/auth/signup/')
        .send({
            email:uniqueEmail, 
            firstName: "Test",
            lastName:"Student",
            password:"TestPassword123"
        })

        expect(response.status).toBe(201)
    })

    it("testing login endpoint", async () => {
        const response = await request(app)
        .post("/api/v1/auth/login/")
        .send({
            email:"admin.test@schoolos.com",
            password:"admin-test@2026"
        })

        expect(response.status).toBe(200)
    })

    it("testing user profile fetching", async ()=>{
        
        const response = await request(app)
        .get("/api/v1/auth/me/")
        .set({
            "Content-Type":"application/json",
            "Authorization":`Bearer ${accessToken}`
        })
        
        expect(response.status).toBe(200)
        
    })
    it("testing user profile updating endpoint", async () => {
        const response = await request(app)
        .patch("/api/v1/auth/me/")
        .set({
            "Content-Type":"application/json",
            "Authorization":`Bearer ${accessToken}`
        })
        .send({
            "firstName":"Test"
        })

        expect(response.status).toBe(200)
    })

    it("testing access token refresh endpoint", async ()=>{
        const response = await request(app)
        .post("/api/v1/auth/token/refresh/")
        .send({
            refreshToken: refreshToken
        })

        expect(response.status).toBe(200)
        accessToken = response.body.data.accessToken;
    }) 

    it("testing logout endpoint", async () => {
        const response = await request(app).post("/api/v1/auth/logout/")
        .set({
            "Content-Type":"application/json",
            "Authorization":`Bearer ${accessToken}`
        })
        .send({
            refreshToken: refreshToken
        })   
        expect(response.status).toBe(200)
    })
});


