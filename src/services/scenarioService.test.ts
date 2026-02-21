import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScenarioStatus } from '@/types';
import type { Scenario } from '@/types';

// --- Mocks Firebase ---

const mockBatch = {
    update: vi.fn(),
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
};

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: string[]) => ({ _path: args.join('/') })),
    doc: vi.fn((...args: unknown[]) => {
        // When called with a collection ref (object), generate a fake auto-id
        if (typeof args[0] === 'object' && !Array.isArray(args[0]) && args.length === 1) {
            return { id: 'auto-generated-id', _path: 'auto' };
        }
        return { id: args[args.length - 1], _path: (args as string[]).slice(1).join('/') };
    }),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((...args: unknown[]) => args),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-scenario-id' }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(() => mockBatch),
}));

vi.mock('@/src/services/firebase', () => ({
    db: {},
}));

// Import AFTER mocks are declared
import { scenarioService } from '@/src/services/scenarioService';
import {
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    writeBatch,
    doc,
} from 'firebase/firestore';

describe('scenarioService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- createScenario ---
    describe('createScenario', () => {
        it('doit appeler addDoc et retourner un ID', async () => {
            const scenarioData = {
                name: 'Test Scenario',
                status: ScenarioStatus.DRAFT,
                ownerId: 'user-1',
                envelopes: [],
                resources: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            const result = await scenarioService.createScenario(scenarioData);

            expect(addDoc).toHaveBeenCalledTimes(1);
            expect(addDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    name: 'Test Scenario',
                    status: ScenarioStatus.DRAFT,
                    updatedAt: expect.any(Number),
                })
            );
            expect(result).toBe('new-scenario-id');
        });

        it('doit inclure updatedAt dans les données envoyées', async () => {
            const now = Date.now();
            const scenarioData = {
                name: 'Scenario avec timestamp',
                status: ScenarioStatus.DRAFT,
                ownerId: 'user-1',
                envelopes: [],
                resources: [],
                createdAt: now,
                updatedAt: 0,
            };

            await scenarioService.createScenario(scenarioData);

            const callArgs = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
            expect(callArgs.updatedAt).toBeGreaterThanOrEqual(now);
        });
    });

    // --- updateScenario ---
    describe('updateScenario', () => {
        it('doit appeler updateDoc avec updatedAt', async () => {
            const now = Date.now();

            await scenarioService.updateScenario('scenario-1', { name: 'Nom modifié' });

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'scenarios', 'scenario-1');
            expect(updateDoc).toHaveBeenCalledTimes(1);
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    name: 'Nom modifié',
                    updatedAt: expect.any(Number),
                })
            );
            const callArgs = vi.mocked(updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
            expect(callArgs.updatedAt).toBeGreaterThanOrEqual(now);
        });
    });

    // --- deleteScenario ---
    describe('deleteScenario', () => {
        it('doit appeler deleteDoc avec la bonne référence', async () => {
            await scenarioService.deleteScenario('scenario-to-delete');

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'scenarios', 'scenario-to-delete');
            expect(deleteDoc).toHaveBeenCalledTimes(1);
        });
    });

    // --- publishScenario ---
    describe('publishScenario', () => {
        it('doit archiver les masters, promouvoir le draft et créer un nouveau draft', async () => {
            const currentMasters: Scenario[] = [
                {
                    id: 'master-1',
                    name: 'Master actuel',
                    status: ScenarioStatus.MASTER,
                    ownerId: 'user-1',
                    envelopes: [],
                    resources: [],
                    createdAt: 1000,
                    updatedAt: 2000,
                },
            ];

            const draftData: Scenario = {
                id: 'draft-1',
                name: 'Mon Draft',
                status: ScenarioStatus.DRAFT,
                ownerId: 'user-1',
                envelopes: [{ id: 'env-1', name: 'Run', type: 'RUN' as never, amount: 100000 }],
                resources: [],
                createdAt: 1000,
                updatedAt: 2000,
            };

            const newDraftId = await scenarioService.publishScenario(
                'draft-1',
                'user-1',
                draftData,
                currentMasters
            );

            expect(writeBatch).toHaveBeenCalledTimes(1);

            // Archive les masters existants
            expect(mockBatch.update).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: ScenarioStatus.ARCHIVED })
            );

            // Promouvoir le draft en master
            expect(mockBatch.update).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ status: ScenarioStatus.MASTER })
            );

            // Créer un nouveau draft
            expect(mockBatch.set).toHaveBeenCalledTimes(1);
            expect(mockBatch.set).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    status: ScenarioStatus.DRAFT,
                    ownerId: 'user-1',
                    parentId: 'draft-1',
                })
            );

            // Commit le batch
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);

            // Retourne l'ID du nouveau draft
            expect(newDraftId).toBe('auto-generated-id');
        });

        it('doit gérer le cas sans masters existants', async () => {
            const draftData: Scenario = {
                id: 'draft-1',
                name: 'Premier Draft',
                status: ScenarioStatus.DRAFT,
                ownerId: 'user-1',
                envelopes: [],
                resources: [],
                createdAt: 1000,
                updatedAt: 2000,
            };

            await scenarioService.publishScenario('draft-1', 'user-1', draftData, []);

            // Pas d'archivage si pas de masters
            // 1 appel pour promouvoir le draft en master uniquement
            expect(mockBatch.update).toHaveBeenCalledTimes(1);
            expect(mockBatch.set).toHaveBeenCalledTimes(1);
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);
        });
    });

    // --- subscribeToScenarios ---
    describe('subscribeToScenarios', () => {
        it('doit configurer deux listeners onSnapshot et retourner une fonction de désinscription', () => {
            const mockUnsubPublic = vi.fn();
            const mockUnsubDrafts = vi.fn();
            vi.mocked(onSnapshot)
                .mockReturnValueOnce(mockUnsubPublic)
                .mockReturnValueOnce(mockUnsubDrafts);

            const onUpdate = vi.fn();
            const onError = vi.fn();

            const unsubscribe = scenarioService.subscribeToScenarios('user-1', onUpdate, onError);

            // Deux appels à onSnapshot (public + drafts)
            expect(onSnapshot).toHaveBeenCalledTimes(2);

            // La fonction retournée doit désinscrire les deux listeners
            unsubscribe();
            expect(mockUnsubPublic).toHaveBeenCalledTimes(1);
            expect(mockUnsubDrafts).toHaveBeenCalledTimes(1);
        });

        it('doit fusionner et trier les résultats des deux queries', () => {
            vi.mocked(onSnapshot).mockImplementation((_query, _callback) => {
                return vi.fn();
            });

            const onUpdate = vi.fn();
            const onError = vi.fn();

            scenarioService.subscribeToScenarios('user-1', onUpdate, onError);

            // Simulate the public snapshot callback (first onSnapshot call)
            const publicCallback = vi.mocked(onSnapshot).mock.calls[0][1] as (snapshot: unknown) => void;
            publicCallback({
                docs: [
                    {
                        id: 'master-1',
                        data: () => ({
                            name: 'Master',
                            status: ScenarioStatus.MASTER,
                            updatedAt: 1000,
                        }),
                    },
                ],
            });

            expect(onUpdate).toHaveBeenCalledTimes(1);

            // Simulate the drafts snapshot callback (second onSnapshot call)
            const draftsCallback = vi.mocked(onSnapshot).mock.calls[1][1] as (snapshot: unknown) => void;
            draftsCallback({
                docs: [
                    {
                        id: 'draft-1',
                        data: () => ({
                            name: 'Draft',
                            status: ScenarioStatus.DRAFT,
                            updatedAt: 2000,
                        }),
                    },
                ],
            });

            expect(onUpdate).toHaveBeenCalledTimes(2);

            // Le dernier appel doit contenir les deux scénarios, draft en premier
            const lastCall = onUpdate.mock.calls[1][0];
            expect(lastCall).toHaveLength(2);
            expect(lastCall[0].status).toBe(ScenarioStatus.DRAFT);
            expect(lastCall[1].status).toBe(ScenarioStatus.MASTER);
        });
    });
});
