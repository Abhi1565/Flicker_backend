import jwt from "jsonwebtoken";
const isAuthenticated = async(req,res,next) => {
  try {
    let token = req.cookies.token;

    // If no cookie, check Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if(!token){
        return res.status(401).json({message:"User not authenticated."})
    };
    
    const decode = await jwt.verify(token,process.env.JWT_SECRET_KEY);
    req.id = decode.userId;
    next();
  } catch (error) {
    console.log('Auth error:', error.message);
    return res.status(401).json({message:"Invalid token"});
  }
};
export default isAuthenticated;