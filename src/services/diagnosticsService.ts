import { db } from './firebase';
import { collection, getDocs, query, where, limit, getDoc, doc } from 'firebase/firestore';

export interface ConnectionCheckResult {
    ok: boolean;
    latencyMs: number;
    message?: string;
}

export interface PermissionsCheckResult {
    ok: boolean;
    message?: string;
}

export const diagnosticsService = {
    /**
     * Pings Firestore to check connectivity and measure latency.
     * A "permission-denied" error still means the connection works.
     */
    checkConnection: async (): Promise<ConnectionCheckResult> => {
        const start = performance.now();
        try {
            await getDoc(doc(db, 'health_check', 'ping'));
            const latencyMs = Math.round(performance.now() - start);
            return { ok: true, latencyMs };
        } catch (e: unknown) {
            const err = e as { code?: string; message?: string };
            const latencyMs = Math.round(performance.now() - start);
            if (err.code === 'permission-denied') {
                // Connection works, just denied by rules
                return { ok: true, latencyMs, message: 'permission-denied' };
            }
            return { ok: false, latencyMs, message: err.message || 'Unknown error' };
        }
    },

    /**
     * Checks if the user can read their own scenarios (Firestore rules).
     */
    checkPermissions: async (email: string): Promise<PermissionsCheckResult> => {
        try {
            const q = query(
                collection(db, 'scenarios'),
                where('ownerId', '==', email),
                limit(1)
            );
            await getDocs(q);
            return { ok: true };
        } catch (e: unknown) {
            const err = e as { message?: string };
            return { ok: false, message: err.message || 'Unknown error' };
        }
    },
};
