import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'
const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

app.use(express.json());
app.use(cookieParser())


app.get('/',(req,res)=>{
    res.send('hello world')
})

import userRouter from './routes/user.route.js'
import messageRouter from './routes/message.route.js'
import groupRouter from './routes/group.route.js'

app.use('/api/users',userRouter);
app.use('/api/messages',messageRouter);
app.use('/api/groups',groupRouter);

export default app;
