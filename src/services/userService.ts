import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    deleteDoc, 
    query, 
    where, 
    doc,
    onSnapshot,
    setDoc,
    getDoc
} from 'firebase/firestore';

export type UserRole = 'ADMIN' | 'USER';

export interface AppUser {
    id: string; // Will be the Email
    email: string;
    role: UserRole;
    addedAt: number;
    addedBy?: string;
}

const COLLECTION_NAME = 'authorized_users';

export const userService = {
    /**
     * Checks if a user exists in the whitelist and returns their role.
     * Returns null if not authorized.
     */
    getUserRole: async (email: string): Promise<UserRole | null> => {
        if (!email) return null;
        
        // Direct lookup by ID (Email) - Faster & Cheaper
        const docRef = doc(db, COLLECTION_NAME, email);
        const snapshot = await getDoc(docRef);
        
        if (!snapshot.exists()) return null;
        
        const userData = snapshot.data() as AppUser;
        return userData.role;
    },

    /**
     * Adds a user to the whitelist.
     * FORCED UPDATE: Uses email as Document ID.
     */
    addUser: async (email: string, role: UserRole, adminEmail: string): Promise<string> => {
        if (!email) throw new Error("Email invalide");

        // Force lowercase to avoid mismatch
        const emailKey = email.toLowerCase();

        const docRef = doc(db, COLLECTION_NAME, emailKey);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
            throw new Error("Cet utilisateur est déjà autorisé.");
        }

        // Use setDoc with email as ID
        await setDoc(docRef, {
            email: emailKey, // Store email inside too for easier reading
            role,
            addedAt: Date.now(),
            addedBy: adminEmail
        });
        return emailKey;
    },

    /**
     * Removes a user from the whitelist.
     */
    removeUser: async (emailOrId: string): Promise<void> => {
        await deleteDoc(doc(db, COLLECTION_NAME, emailOrId));
    },

    /**
     * Real-time subscription to the user list (for Admin UI).
     */
    subscribeToUsers: (onUpdate: (users: AppUser[]) => void, onError: (err: any) => void) => {
        const q = query(collection(db, COLLECTION_NAME));
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AppUser));
            // Sort: Admins first, then by date
            users.sort((a, b) => {
                if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                return b.addedAt - a.addedAt;
            });
            onUpdate(users);
        }, onError);
    }
};
