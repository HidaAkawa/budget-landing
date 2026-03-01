import { useState, useEffect, useCallback } from 'react';
import { User, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { auth, googleProvider } from '@/src/services/firebase';
import { userService, UserRole } from '@/src/services/userService';
import i18n from '@/src/i18n';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser && currentUser.email) {
        setIsAuthChecking(true);
        try {
          const role = await userService.getUserRole(currentUser.email);

          if (role) {
            setUserRole(role);
            setIsAuthorized(true);
          } else {
            // Bootstrap: Auto-add admin from env variable on first login
            const bootstrapAdmins = (import.meta.env.VITE_BOOTSTRAP_ADMINS || '').split(',').map(e => e.trim()).filter(Boolean);
            if (bootstrapAdmins.includes(currentUser.email)) {
              try {
                await userService.addUser(currentUser.email, 'ADMIN', 'SYSTEM_BOOTSTRAP');
                setUserRole('ADMIN');
                setIsAuthorized(true);
                toast.success(i18n.t('app.adminBootstrapSuccess'));
              } catch (_e) {
                const r = await userService.getUserRole(currentUser.email);
                if (r) { setIsAuthorized(true); setUserRole(r); }
              }
            } else {
              setIsAuthorized(false);
              setUserRole(null);
            }
          }
        } catch (_e) {
          console.error('Auth check failed', _e);
          setIsAuthorized(false);
        } finally {
          setIsAuthChecking(false);
        }
      } else {
        setIsAuthorized(false);
        setUserRole(null);
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
      toast.error(i18n.t('app.loginError'));
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      toast.success(i18n.t('app.logoutSuccess'));
    } catch (error) {
      console.error('Error signing out', error);
    }
  }, []);

  return {
    user,
    isAuthorized,
    userRole,
    isAuthChecking,
    handleLogin,
    handleLogout,
  };
}
