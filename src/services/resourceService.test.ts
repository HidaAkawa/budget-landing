import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Resource, OverrideValue } from '@/types';
import { ContractType, Country } from '@/types';

// --- Mocks Firebase ---

const mockBatch = {
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
};

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: string[]) => ({ _path: args.join('/') })),
    doc: vi.fn((...args: unknown[]) => {
        if (typeof args[0] === 'object' && !Array.isArray(args[0]) && args.length === 1) {
            return { id: 'auto-id', _path: 'auto' };
        }
        return { id: args[args.length - 1], _path: (args as string[]).slice(1).join('/') };
    }),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-resource-id' }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(() => mockBatch),
}));

vi.mock('@/src/services/firebase', () => ({
    db: {},
}));

import { resourceService } from '@/src/services/resourceService';
import {
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    onSnapshot,
    writeBatch,
    collection,
} from 'firebase/firestore';

// --- Helper ---
function makeResource(overrides: Partial<Resource> = {}): Resource {
    return {
        id: 'res-1',
        firstName: 'Jean',
        lastName: 'Dupont',
        contractType: ContractType.INTERNAL,
        tjm: 500,
        country: Country.FR,
        ratioChange: 0,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        overrides: {},
        dynamicHolidays: [],
        ...overrides,
    };
}

describe('resourceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- addResource ---
    describe('addResource', () => {
        it('doit appeler addDoc sur la sous-collection du scénario', async () => {
            const resource = makeResource();
            const { id, ...resourceData } = resource;

            await resourceService.addResource('scenario-1', resourceData);

            expect(collection).toHaveBeenCalledWith(
                expect.anything(),
                'scenarios',
                'scenario-1',
                'resources'
            );
            expect(addDoc).toHaveBeenCalledTimes(1);
            expect(addDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ firstName: 'Jean', lastName: 'Dupont' })
            );
        });
    });

    // --- updateResource ---
    describe('updateResource', () => {
        it('doit appeler updateDoc avec les mises à jour', async () => {
            await resourceService.updateResource('scenario-1', 'res-1', { tjm: 600 });

            expect(updateDoc).toHaveBeenCalledTimes(1);
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ tjm: 600 })
            );
        });
    });

    // --- deleteResource ---
    describe('deleteResource', () => {
        it('doit appeler deleteDoc avec la bonne référence', async () => {
            await resourceService.deleteResource('scenario-1', 'res-1');

            expect(deleteDoc).toHaveBeenCalledTimes(1);
        });
    });

    // --- subscribeToResources ---
    describe('subscribeToResources', () => {
        it('doit configurer un listener onSnapshot et retourner la désinscription', () => {
            const mockUnsub = vi.fn();
            vi.mocked(onSnapshot).mockReturnValue(mockUnsub);

            const onUpdate = vi.fn();
            const onError = vi.fn();

            const unsub = resourceService.subscribeToResources('scenario-1', onUpdate, onError);

            expect(onSnapshot).toHaveBeenCalledTimes(1);
            expect(collection).toHaveBeenCalledWith(
                expect.anything(),
                'scenarios',
                'scenario-1',
                'resources'
            );

            unsub();
            expect(mockUnsub).toHaveBeenCalledTimes(1);
        });

        it('doit transformer les documents en ressources', () => {
            vi.mocked(onSnapshot).mockImplementation((_ref, _callback) => {
                return vi.fn();
            });

            const onUpdate = vi.fn();
            const onError = vi.fn();

            resourceService.subscribeToResources('scenario-1', onUpdate, onError);

            const snapshotCallback = vi.mocked(onSnapshot).mock.calls[0][1] as (snapshot: unknown) => void;
            snapshotCallback({
                docs: [
                    {
                        id: 'res-1',
                        data: () => ({ firstName: 'Marie', lastName: 'Martin', tjm: 400 }),
                    },
                ],
            });

            expect(onUpdate).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'res-1', firstName: 'Marie' }),
            ]);
        });
    });

    // --- updateResourceOverride ---
    describe('updateResourceOverride', () => {
        it('doit mettre à jour la map overrides avec une nouvelle valeur', async () => {
            const resource = makeResource({ overrides: { '2025-03-01': 0.5 } });

            await resourceService.updateResourceOverride('scenario-1', resource, '2025-03-15', 0 as OverrideValue);

            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    overrides: {
                        '2025-03-01': 0.5,
                        '2025-03-15': 0,
                    },
                })
            );
        });

        it('doit supprimer une clé override quand la valeur est undefined', async () => {
            const resource = makeResource({
                overrides: { '2025-03-01': 0.5, '2025-03-15': 0 },
            });

            await resourceService.updateResourceOverride('scenario-1', resource, '2025-03-01', undefined);

            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    overrides: { '2025-03-15': 0 },
                })
            );
        });
    });

    // --- copyResources ---
    describe('copyResources', () => {
        it('doit lire toutes les ressources source et les écrire en batch dans la cible', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [
                    { id: 'res-1', data: () => ({ firstName: 'Jean', tjm: 500 }) },
                    { id: 'res-2', data: () => ({ firstName: 'Marie', tjm: 600 }) },
                ],
            } as never);

            await resourceService.copyResources('source-scenario', 'target-scenario');

            expect(getDocs).toHaveBeenCalledTimes(1);
            expect(writeBatch).toHaveBeenCalledTimes(1);
            expect(mockBatch.set).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);

            // Vérifier que l'ID n'est pas copié (nouveau document)
            const firstSetCall = mockBatch.set.mock.calls[0][1];
            expect(firstSetCall).not.toHaveProperty('id');
            expect(firstSetCall).toHaveProperty('firstName', 'Jean');
        });

        it('doit gérer le cas sans ressources à copier', async () => {
            vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

            await resourceService.copyResources('source-scenario', 'target-scenario');

            expect(mockBatch.set).not.toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);
        });
    });
});
