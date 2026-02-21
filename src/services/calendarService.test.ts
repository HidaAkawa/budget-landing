import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Country } from '@/types';

// --- Mocks Firebase ---

const mockBatch = {
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
};

vi.mock('firebase/firestore', () => ({
    collection: vi.fn((...args: string[]) => ({ _path: args.join('/') })),
    doc: vi.fn((...args: unknown[]) => ({
        id: args[args.length - 1],
        _path: (args as string[]).slice(1).join('/'),
    })),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((...args: unknown[]) => args),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-template-id' }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    getDocs: vi.fn().mockResolvedValue({ docs: [] }),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, id: '', data: () => ({}) }),
    writeBatch: vi.fn(() => mockBatch),
}));

vi.mock('@/src/services/firebase', () => ({
    db: {},
}));

import { calendarService } from '@/src/services/calendarService';
import {
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    writeBatch,
} from 'firebase/firestore';

describe('calendarService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- getAllTemplates ---
    describe('getAllTemplates', () => {
        it('doit retourner tous les templates avec leurs IDs', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [
                    {
                        id: 'tpl-1',
                        data: () => ({
                            name: 'Interne FR',
                            country: Country.FR,
                            isDefault: true,
                            overrides: {},
                        }),
                    },
                    {
                        id: 'tpl-2',
                        data: () => ({
                            name: 'Stagiaire FR',
                            country: Country.FR,
                            isDefault: false,
                            overrides: {},
                        }),
                    },
                ],
            } as never);

            const templates = await calendarService.getAllTemplates();

            expect(getDocs).toHaveBeenCalledTimes(1);
            expect(templates).toHaveLength(2);
            expect(templates[0]).toEqual(
                expect.objectContaining({ id: 'tpl-1', name: 'Interne FR' })
            );
            expect(templates[1]).toEqual(
                expect.objectContaining({ id: 'tpl-2', name: 'Stagiaire FR' })
            );
        });

        it('doit retourner un tableau vide si aucun template', async () => {
            vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

            const templates = await calendarService.getAllTemplates();

            expect(templates).toEqual([]);
        });
    });

    // --- createTemplate ---
    describe('createTemplate', () => {
        it('doit appeler addDoc et retourner un ID', async () => {
            // No existing defaults for this country
            vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

            const template = {
                name: 'Nouveau Template',
                country: Country.PT,
                isDefault: false,
                overrides: {},
            };

            const id = await calendarService.createTemplate(template);

            expect(addDoc).toHaveBeenCalledTimes(1);
            expect(addDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ name: 'Nouveau Template', country: Country.PT })
            );
            expect(id).toBe('new-template-id');
        });

        it('doit désactiver les autres défauts du pays quand isDefault est true', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [
                    { id: 'existing-default', data: () => ({ isDefault: true, country: Country.FR }) },
                ],
            } as never);

            const template = {
                name: 'Nouveau défaut FR',
                country: Country.FR,
                isDefault: true,
                overrides: {},
            };

            await calendarService.createTemplate(template);

            // unsetDefaultsForCountry doit être appelé (via getDocs + writeBatch)
            expect(writeBatch).toHaveBeenCalled();
            expect(mockBatch.update).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ isDefault: false })
            );
            expect(mockBatch.commit).toHaveBeenCalled();

            // Ensuite, addDoc est appelé
            expect(addDoc).toHaveBeenCalledTimes(1);
        });
    });

    // --- updateTemplate ---
    describe('updateTemplate', () => {
        it('doit appeler updateDoc avec les mises à jour', async () => {
            await calendarService.updateTemplate('tpl-1', { name: 'Nom modifié' });

            expect(updateDoc).toHaveBeenCalledTimes(1);
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ name: 'Nom modifié' })
            );
        });

        it('doit gérer isDefault en récupérant le pays du document existant', async () => {
            // Mock getTemplateById via getDoc
            vi.mocked(getDoc).mockResolvedValue({
                exists: () => true,
                id: 'tpl-1',
                data: () => ({ name: 'Interne FR', country: Country.FR, isDefault: false, overrides: {} }),
            } as never);

            // No existing defaults to unset
            vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

            await calendarService.updateTemplate('tpl-1', { isDefault: true });

            // Should have fetched existing doc to get country
            expect(getDoc).toHaveBeenCalled();
            // Then updateDoc
            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ isDefault: true })
            );
        });

        it('doit utiliser le pays des updates si fourni', async () => {
            vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

            await calendarService.updateTemplate('tpl-1', {
                isDefault: true,
                country: Country.PT,
            });

            // Should NOT call getDoc since country is in updates
            expect(getDoc).not.toHaveBeenCalled();
            expect(updateDoc).toHaveBeenCalled();
        });
    });

    // --- deleteTemplate ---
    describe('deleteTemplate', () => {
        it('doit appeler deleteDoc avec la bonne référence', async () => {
            await calendarService.deleteTemplate('tpl-to-delete');

            expect(deleteDoc).toHaveBeenCalledTimes(1);
        });
    });

    // --- unsetDefaultsForCountry ---
    describe('unsetDefaultsForCountry', () => {
        it('doit désactiver isDefault sur tous les templates du pays', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [
                    { id: 'tpl-1', data: () => ({ isDefault: true }) },
                    { id: 'tpl-2', data: () => ({ isDefault: true }) },
                ],
            } as never);

            await calendarService.unsetDefaultsForCountry(Country.FR);

            expect(mockBatch.update).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);
        });

        it('doit exclure un template spécifique si excludeId est fourni', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [
                    { id: 'tpl-1', data: () => ({ isDefault: true }) },
                    { id: 'tpl-2', data: () => ({ isDefault: true }) },
                ],
            } as never);

            await calendarService.unsetDefaultsForCountry(Country.FR, 'tpl-1');

            // Seul tpl-2 doit être mis à jour
            expect(mockBatch.update).toHaveBeenCalledTimes(1);
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);
        });

        it('ne doit pas appeler batch.commit si aucune mise à jour nécessaire', async () => {
            vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

            await calendarService.unsetDefaultsForCountry(Country.FR);

            expect(mockBatch.commit).not.toHaveBeenCalled();
        });
    });
});
