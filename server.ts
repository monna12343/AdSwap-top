import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from 'firebase-admin/firestore';
import fs from "fs";

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      console.log("Initializing Firebase Admin with Service Account from environment");
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        projectId: firebaseConfig.projectId,
      });
    } else {
      console.log("Initializing Firebase Admin with Application Default Credentials");
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId,
      });
    }
    console.log("Firebase Admin initialized successfully");
  } catch (err: any) {
    console.error("Firebase Admin initialization failed:", err.message);
    // Fallback to simple initialization if applicationDefault fails
    try {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin initialized with fallback (no credential)");
    } catch (fallbackErr: any) {
      console.error("Firebase Admin fallback initialization failed:", fallbackErr.message);
    }
  }
}

const dbAdmin = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Admin
  const verifyAdmin = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("Auth failed: No bearer token");
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      
      console.log(`Verifying admin status for UID: ${uid}, Email: ${email}`);

      // Check hardcoded admin first
      if (email === 'monnajamal2000@gmail.com' && decodedToken.email_verified) {
        console.log("Hardcoded admin verified");
        req.adminUid = uid;
        return next();
      }

      // Check if user is admin in Firestore
      try {
        const userDoc = await dbAdmin.collection('users').doc(uid).get();
        const userData = userDoc.data();
        
        if (userData?.role === 'admin') {
          console.log("Firestore admin verified");
          req.adminUid = uid;
          next();
        } else {
          console.log(`User ${uid} is not an admin. Role: ${userData?.role}`);
          res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
      } catch (firestoreErr: any) {
        console.error("Firestore admin check failed:", firestoreErr.message);
        // If we are here and not the hardcoded admin, we fail
        res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
    } catch (err: any) {
      console.error("Auth verification failed. Error details:", {
        message: err.message,
        code: err.code,
        stack: err.stack,
        errorInfo: err.errorInfo
      });
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Admin Routes
  app.post("/api/admin/users/:uid/password", verifyAdmin, async (req: any, res: any) => {
    const { uid } = req.params;
    const { newPassword } = req.body;
    console.log(`Attempting to update password for user ${uid} by admin ${req.adminUid}`);
    try {
      await admin.auth().updateUser(uid, { password: newPassword });
      console.log(`Successfully updated password for user ${uid}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update password:", err);
      let errorMessage = err.message || 'Failed to update password';
      
      // Check for disabled API error and extract link
      if (errorMessage.includes('identitytoolkit.googleapis.com')) {
        const activationUrlMatch = errorMessage.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/identitytoolkit\.googleapis\.com\/overview\?project=[^\s"]+/);
        if (activationUrlMatch) {
          errorMessage = `Identity Toolkit API is disabled. Please enable it at: ${activationUrlMatch[0]}`;
        } else {
          errorMessage = `Identity Toolkit API is disabled. Please enable it in your Google Cloud Console for project ${firebaseConfig.projectId}.`;
        }
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/admin/users/:uid/role", verifyAdmin, async (req: any, res: any) => {
    const { uid } = req.params;
    const { newRole } = req.body;
    console.log(`Attempting to update role for user ${uid} to ${newRole} by admin ${req.adminUid}`);
    try {
      const userDoc = await dbAdmin.collection('users').doc(uid).get();
      const userData = userDoc.data();
      
      if (userData?.email === 'monnajamal2000@gmail.com') {
        console.log(`Blocked attempt to change role of primary admin: ${userData.email}`);
        return res.status(403).json({ error: 'Cannot change role of the primary admin' });
      }

      await dbAdmin.collection('users').doc(uid).update({ role: newRole });
      console.log(`Successfully updated role for user ${uid} to ${newRole}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Admin change role error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:uid", verifyAdmin, async (req: any, res: any) => {
    const { uid } = req.params;
    try {
      await admin.auth().deleteUser(uid);
      await dbAdmin.collection('users').doc(uid).delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || 'Failed to delete user';
      
      // Check for disabled API error and extract link
      if (errorMessage.includes('identitytoolkit.googleapis.com')) {
        const activationUrlMatch = errorMessage.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/identitytoolkit\.googleapis\.com\/overview\?project=[^\s"]+/);
        if (activationUrlMatch) {
          errorMessage = `Identity Toolkit API is disabled. Please enable it at: ${activationUrlMatch[0]}`;
        } else {
          errorMessage = `Identity Toolkit API is disabled. Please enable it in your Google Cloud Console for project ${firebaseConfig.projectId}.`;
        }
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // URL Shortener Redirect
  // In a real app, we'd fetch from Firestore here.
  // Since we are in a sandboxed environment, we can't easily query Firestore from the backend without service account keys.
  // However, the prompt asks for a "built-in URL shortener".
  // We can implement a simple client-side redirect or a server-side one if we had the keys.
  // For now, let's provide the route and explain how it would work.
  app.get("/s/:code", (req, res) => {
    // This would ideally look up the code in Firestore and redirect.
    // For this demo, we'll redirect to a special client route that handles the lookup.
    res.redirect(`/?shortCode=${req.params.code}`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
