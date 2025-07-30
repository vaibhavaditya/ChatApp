export const asyncHandler = (controllerFunction) => {
    return async (req,res,next) => {
        try {
            await controllerFunction(req,res,next)
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message
            })
        }
    }
}