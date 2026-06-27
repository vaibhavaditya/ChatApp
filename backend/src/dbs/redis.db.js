import {createClient} from 'redis'

export const redisClient = createClient({
    url: process.env.REDIS_URL,
})

redisClient.on("error",(err)=>{
    console.log("Redis Error: ", err);
    
})

export const connectRedisDB = async() => {
    try {
        await redisClient.connect()
        console.log("Connected to Redis");
    } catch (error) {
        console.log("Redis connection failed",error.message);   
    }
    
}