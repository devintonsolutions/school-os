import request  from "supertest"
import app from '../app'
import { expect } from 'vitest';

export const getTestStudentTokens = async () => {
    const response = await request(app)
    .post("/api/v1/auth/login/")
    .send({
        email:process.env.TEST_STUDENT_EMAIL!,
        password:process.env.TEST_STUDENT_PASSWORD!
    })

    expect(response.status).toBe(200)

    return {
        student: response.body.data.user,
        accessToken:response.body.data.accessToken as string,
        refreshToken:response.body.data.refreshToken as string
    }
}

export const getTestAdminTokens = async () => {
    const response = await request(app)
    .post("/api/v1/auth/login/")
    .send({
        email:process.env.TEST_ADMIN_EMAIL!,
        password:process.env.TEST_ADMIN_PASSWORD!
    })

    expect(response.status).toBe(200)

    return {
        adminAccessToken:response.body.data.accessToken as string,
        adminRefreshToken:response.body.data.refreshToken as string
    }
}