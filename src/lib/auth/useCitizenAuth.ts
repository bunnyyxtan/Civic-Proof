// src/lib/auth/useCitizenAuth.ts
import { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseClient";
import { ensureAnonymousUser, getCitizenIdToken, getOrCreateFallbackUid, getFallbackIdToken } from "./authClient";
import { User } from "firebase/auth";

export function useCitizenAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackUid] = useState<string>(() => getOrCreateFallbackUid());

  useEffect(() => {
    // Fetch token on initialization
    getCitizenIdToken().then((token) => {
      setIdToken(token);
    });

    // Handle authentication state changes
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await u.getIdToken();
          setIdToken(token);
        } catch (e) {
          console.error("Error getting idToken from user, using fallback:", e);
          setIdToken(getFallbackIdToken());
        }
      } else {
        // If no user, fetch again (will fall back to local mock token)
        const token = await getCitizenIdToken();
        setIdToken(token);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const citizen = user 
    ? { uid: user.uid, email: user.email || undefined, isAnonymous: user.isAnonymous }
    : { uid: fallbackUid, isAnonymous: true };

  return {
    user,
    citizen,
    idToken,
    loading,
    uid: user?.uid || fallbackUid,
    isAnonymous: user ? user.isAnonymous : true,
    email: user?.email || null,
  };
}
