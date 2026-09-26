/* This file contains application configurations */

import express from 'express';

const app = express();

app.use(express.json());

app.get('/health',(req, res)=>{
    res.json({
        'status':'ok'
    })
})

export default app;