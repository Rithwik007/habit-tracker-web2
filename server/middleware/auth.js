import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
}

// Middleware to verify Firebase JWT tokens
export const verifyToken = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header is missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  const projectId = 'habit-tracker-7c785'; // Firebase Project ID

  jwt.verify(token, getKey, {
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      console.error('[AuthMiddleware] Token verification failed:', err.message);
      return res.status(403).json({ message: 'Forbidden: Invalid token' });
    }
    
    // Save decoded token payload to req.user (contains uid)
    req.user = decoded;
    next();
  });
};

// Middleware to verify that the logged-in user matches the resource owner
export const verifyUser = (req, res, next) => {
  verifyToken(req, res, () => {
    const tokenUid = req.user?.uid;
    const targetUserId = req.params?.userId || req.body?.userId || req.query?.userId || req.body?.firebaseId;
    
    if (targetUserId && tokenUid !== targetUserId) {
      return res.status(403).json({ message: 'Forbidden: User identity mismatch' });
    }
    next();
  });
};
