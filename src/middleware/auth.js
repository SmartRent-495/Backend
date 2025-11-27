const config = require('../config/config');
const { initializeFirebase, admin } = require('../config/firebase');
const { getUserService } = require('../services/users.service');

// Initialize Firebase Admin
let firebaseReady = false;

try {
    const firebaseConfig = initializeFirebase();
    if (firebaseConfig.isFirebase) {
        firebaseReady = true;
        console.log('✅ Firebase Admin ready for authentication');
    } else {
        console.error('❌ Firebase is NOT configured - authentication will fail');
    }
} catch (error) {
    console.error('⚠️ Firebase initialization failed in auth middleware:', error.message);
}

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Authentication token required' 
            });
        }

        const token = authHeader.replace('Bearer ', '').trim();
        
        // Verify Firebase token
        if (!firebaseReady || !admin) {
            console.error('[Auth] Firebase not ready!');
            return res.status(500).json({
                status: 'error',
                message: 'Firebase authentication not configured'
            });
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            const userId = decodedToken.uid;
            
            console.log('[Auth] Token verified for:', decodedToken.email);
            
            // Get user from Firestore
            const userService = getUserService();
            const user = await userService.getUserById(userId);
            
            if (!user) {
                console.log('[Auth Middleware] User not found in Firestore:', decodedToken.email);
                return res.status(404).json({ 
                    status: 'error', 
                    message: 'User not found. Please complete registration.' 
                });
            }
            
            // Attach user info to request
            req.user = {
                userId: user.uid,
                username: user.displayName,
                email: user.email,
                role: user.role,
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                phone: user.phoneNumber
            };
            
            return next();
        } catch (firebaseError) {
            console.error('[Auth] Firebase token verification failed:', firebaseError.message);
            console.error('[Auth] Error code:', firebaseError.code);
            return res.status(401).json({
                status: 'error',
                message: 'Invalid authentication token',
                details: firebaseError.message
            });
        }
    } catch (error) {
        console.error('[Auth] Authentication error:', error);
        res.status(401).json({
            status: 'error',
            message: 'Please authenticate'
        });
    }
};

// Middleware to check if user is a landlord
const requireLandlord = (req, res, next) => {
    if (req.user.role !== 'landlord') {
        return res.status(403).json({
            status: 'error',
            message: 'Access denied. Landlord role required.'
        });
    }
    next();
};

// Middleware to check if user is a tenant
const requireTenant = (req, res, next) => {
    if (req.user.role !== 'tenant') {
        return res.status(403).json({
            status: 'error',
            message: 'Access denied. Tenant role required.'
        });
    }
    next();
};

// Firebase-only authentication for registration (doesn't require user in DB)
const authenticateFirebaseOnly = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        console.log('[FirebaseOnly Auth] Headers:', {
            hasAuth: !!authHeader,
            firebaseReady,
            hasAdmin: !!admin
        });
        
        if (!authHeader) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Authentication token required' 
            });
        }

        const token = authHeader.replace('Bearer ', '').trim();
        
        console.log('[FirebaseOnly Auth] Token length:', token.length);
        
        // Verify Firebase token
        if (!firebaseReady || !admin) {
            console.error('[FirebaseOnly Auth] Firebase not ready!');
            return res.status(500).json({
                status: 'error',
                message: 'Firebase authentication not configured'
            });
        }

        try {
            console.log('[FirebaseOnly Auth] Verifying token...');
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            console.log('[FirebaseOnly Auth] ✅ Token verified for:', decodedToken.email);
            
            // Attach Firebase user info to request (no DB check)
            req.user = {
                email: decodedToken.email,
                firebaseUid: decodedToken.uid,
                name: decodedToken.name || ''
            };
            
            return next();
        } catch (firebaseError) {
            console.error('[FirebaseOnly Auth] ❌ Token verification failed:', firebaseError.message);
            console.error('[FirebaseOnly Auth] Error code:', firebaseError.code);
            return res.status(401).json({
                status: 'error',
                message: 'Invalid Firebase token',
                details: firebaseError.message
            });
        }
    } catch (error) {
        console.error('[FirebaseOnly Auth] Exception:', error);
        res.status(401).json({
            status: 'error',
            message: 'Authentication error',
            details: error.message
        });
    }
};

// Legacy export for backward compatibility
const auth = authenticateToken;

module.exports = {
    auth,
    authenticateToken,
    authenticateFirebaseOnly,
    requireLandlord,
    requireTenant
};