import request  from "supertest"
import app from '../app'
import { expect } from 'vitest';

export const getStudentTestTokens = async () => {
    const response = await request(app)
    .post("/api/v1/auth/login/")
    .send({
        email:process.env.TEST_STUDENT_EMAIL!,
        password:process.env.TEST_STUDENT_PASSWORD!
    })

    expect(response.status).toBe(200)

    return {
        accessToken:response.body.data.accessToken as string,
        refreshToken:response.body.data.refreshToken as string
    }
}

export const getAdminTestTokens = async () => {
    const response = await request(app)
    .post("/api/v1/auth/login/")
    .send({
        email:process.env.TEST_ADMIN_EMAIL!,
        password:process.env.TEST_ADMIN_PASSWORD!
    })

    expect(response.status).toBe(200)

    return {
        accessToken:response.body.data.accessToken as string,
        refreshToken:response.body.data.refreshToken as string
    }
}