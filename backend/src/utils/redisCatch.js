import { redisClient } from "../dbs/redis.db.js";
import { asyncHandler } from "./asyncHandler.js";

export const redishCatch = asyncHandler(async (key, cb, ttl = 3600) => {
    try {
        const cached = await redisClient.get(key);
        if (cached) {
            return JSON.parse(cached);
        }

        const fresh = await cb();
        await redisClient.setEx(key, ttl, JSON.stringify(fresh));
        return fresh;
    } catch (error) {
        console.log("Redis catch error:", error);
        return await cb();
    }
});
