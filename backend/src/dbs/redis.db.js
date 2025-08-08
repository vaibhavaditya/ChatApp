import {createClient} from 'redis'

export const redisClient = createClient({
    url: "redis://127.0.0.1:6379"
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