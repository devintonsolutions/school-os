import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app'

describe("Application",()=>{
    it("should return a healthy status",async ()=>{
        const res = await request(app).get('/health/');

        expect(res.status).toBe(200)
        expect(res.body).toEqual({
            'status':'ok'
        })
    })
})