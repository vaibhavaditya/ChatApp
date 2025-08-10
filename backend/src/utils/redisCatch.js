import { redisClient } from "../dbs/redis.db.js";
import { asyncHandler } from "./asyncHandler.js";

// Updated redishCatch function (without asyncHandler)
export const redishCatch = async (key, cb, ttl = 3600000) => {
    try {
        const cached = await redisClient.get(key);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch (parseError) {
                console.log("JSON parse error:", parseError);
            }
        }
        // console.log(12334);
        
        const fresh = await cb();
        await redisClient.setEx(key, ttl, JSON.stringify(fresh));
        return fresh;
    } catch (error) {
        console.log("Redis catch error:", error);
        return await cb();
    }
};