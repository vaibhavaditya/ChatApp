import dotenv from 'dotenv';
dotenv.config();
import {connectDB} from './dbs/mongo.db.js';
import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocket } from './socket/index.js'
import { connectRedisDB } from './dbs/redis.db.js';

const startApp = async() => {
    try {
        await connectDB()
        await connectRedisDB()
        const port = process.env.PORT || 3000

        const server = createServer(app);
        const io = new Server(
            server,
            {
                cors:{
                    origin: "http://localhost:5173",
                    credentials: true
                }   
            } 
        )

        setupSocket(io);
        server.listen(port,()=>{
            console.log(`Server is running at http://localhost:${port}`);
        })
    } catch (error) {
        console.log('Failed to oad server: ',error);
    }
}

startApp();