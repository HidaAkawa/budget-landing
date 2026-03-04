import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks Firebase ---

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: string[]) => ({ _path: args.join('/') })),
    doc: vi.fn((...args: unknown[]) => ({ id: args[args.length - 1], _path: (args as string[]).slice(1).join('/') })),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((...args: unknown[]) => args),
    limit: vi.fn((n: number) => n),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock('./firebase', () => ({
    db: {},
}));

import { diagnosticsService } from './diagnosticsService';

describe('diagnosticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkConnection', () => {
        it('doit retourner ok si Firestore répond', async () => {
            mockGetDoc.mockResolvedValue({ exists: () => false });

            const result = await diagnosticsService.checkConnection();

            expect(result.ok).toBe(true);
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it('doit retourner ok si permission-denied (connexion fonctionne)', async () => {
            mockGetDoc.mockRejectedValue({ code: 'permission-denied', message: 'Permission denied' });

            const result = await diagnosticsService.checkConnection();

            expect(result.ok).toBe(true);
            expect(result.message).toBe('permission-denied');
        });

        it('doit retourner une erreur pour une erreur réseau', async () => {
            mockGetDoc.mockRejectedValue({ code: 'unavailable', message: 'Network error' });

            const result = await diagnosticsService.checkConnection();

            expect(result.ok).toBe(false);
            expect(result.message).toBe('Network error');
        });
    });

    describe('checkPermissions', () => {
        it('doit retourner ok si l\'utilisateur peut lire ses scénarios', async () => {
            mockGetDocs.mockResolvedValue({ docs: [] });

            const result = await diagnosticsService.checkPermissions('user@test.com');

            expect(result.ok).toBe(true);
        });

        it('doit retourner une erreur si l\'accès est refusé', async () => {
            mockGetDocs.mockRejectedValue({ message: 'Permission denied' });

            const result = await diagnosticsService.checkPermissions('user@test.com');

            expect(result.ok).toBe(false);
            expect(result.message).toBe('Permission denied');
        });
    });
});
