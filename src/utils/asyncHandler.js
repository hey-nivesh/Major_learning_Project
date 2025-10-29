//const asycHandler = () => {}
//const asyncHandler = (fn) => () => {}
//const asyncHandler = (fn) => async() => {}

// wraper function for handling the async errors in express routes using try catch

// const asyncHandler = (fn) => async(req, res, next) =>{
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 400).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
        .catch((error) => next(error));
    }
}

export { asyncHandler }