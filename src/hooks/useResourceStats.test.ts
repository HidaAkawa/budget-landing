import { describe, it, expect, vi } from 'vitest';
import { ContractType, Country } from '@/types';
import type { Resource } from '@/types';

// Mock the dependencies
vi.mock('@/constants', () => ({
    HOLIDAYS: {
        FR: ['2025-01-01', '2025-05-01', '2025-07-14', '2025-12-25'],
        PT: [],
    } as Record<string, string[]>,
}));

// We need to import getCachedResourceStats, which depends on calculateYearlyStats from @/utils.
// We do NOT mock @/utils because we want to test the real calculation logic.

import { getCachedResourceStats } from '@/src/hooks/useResourceStats';

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

describe('useResourceStats — getCachedResourceStats', () => {
    // --- Calcul des jours pour une année complète ---
    describe('calcul des jours ouvrés', () => {
        it('doit calculer les jours ouvrés pour une ressource à l\'année', () => {
            const resource = makeResource();
            const stats = getCachedResourceStats(resource, 2025);

            // 2025: 365 days, 104 weekend days = 261 weekdays
            // Minus FR holidays that fall on weekdays:
            // 2025-01-01 (Wed), 2025-05-01 (Thu), 2025-07-14 (Mon), 2025-12-25 (Thu) = 4 holidays on weekdays
            // So 261 - 4 = 257 working days
            expect(stats.days).toBe(257);
            expect(stats.cost).toBe(257 * 500);
        });

        it('doit exclure les weekends', () => {
            // Resource starting on a Monday, ending on a Sunday (one full week)
            const resource = makeResource({
                startDate: '2025-03-03', // Monday
                endDate: '2025-03-09',   // Sunday
                country: Country.PT,     // No holidays in PT mock
            });

            const stats = getCachedResourceStats(resource, 2025);

            // Mon-Fri = 5 working days, Sat-Sun = 0
            expect(stats.days).toBe(5);
        });

        it('doit exclure les jours fériés statiques', () => {
            // Week containing May 1st (Thursday) — a FR holiday
            const resource = makeResource({
                startDate: '2025-04-28', // Monday
                endDate: '2025-05-04',   // Sunday
            });

            const stats = getCachedResourceStats(resource, 2025);

            // Mon-Fri = 5 weekdays, minus 1 holiday (May 1st) = 4
            expect(stats.days).toBe(4);
        });

        it('doit exclure les jours fériés dynamiques', () => {
            const resource = makeResource({
                startDate: '2025-03-03',
                endDate: '2025-03-09',
                country: Country.PT, // No static holidays
                dynamicHolidays: ['2025-03-05'], // Wednesday
            });

            const stats = getCachedResourceStats(resource, 2025);

            // 5 weekdays - 1 dynamic holiday = 4
            expect(stats.days).toBe(4);
        });
    });

    // --- Overrides ---
    describe('gestion des overrides', () => {
        it('doit respecter les overrides (congé = 0)', () => {
            const resource = makeResource({
                startDate: '2025-03-03',
                endDate: '2025-03-07', // Mon-Fri
                country: Country.PT,
                overrides: {
                    '2025-03-04': 0,  // Tuesday off
                },
            });

            const stats = getCachedResourceStats(resource, 2025);

            // 5 weekdays - 1 override (0) = 4
            expect(stats.days).toBe(4);
        });

        it('doit respecter les overrides demi-journée (0.5)', () => {
            const resource = makeResource({
                startDate: '2025-03-03',
                endDate: '2025-03-07',
                country: Country.PT,
                overrides: {
                    '2025-03-04': 0.5,
                },
            });

            const stats = getCachedResourceStats(resource, 2025);

            // 4 full days + 0.5 = 4.5
            expect(stats.days).toBe(4.5);
        });

        it('doit permettre de travailler un weekend via override', () => {
            const resource = makeResource({
                startDate: '2025-03-01',
                endDate: '2025-03-09',
                country: Country.PT,
                overrides: {
                    '2025-03-08': 1, // Saturday worked
                },
            });

            const stats = getCachedResourceStats(resource, 2025);

            // Weekdays: Mar 3-7 = 5 days
            // Override on Saturday: +1
            // Total: 6
            expect(stats.days).toBe(6);
        });
    });

    // --- Calcul du coût ---
    describe('calcul du coût', () => {
        it('doit calculer le coût total = jours * TJM', () => {
            const resource = makeResource({
                startDate: '2025-03-03',
                endDate: '2025-03-07',
                country: Country.PT,
                tjm: 700,
            });

            const stats = getCachedResourceStats(resource, 2025);

            expect(stats.cost).toBe(5 * 700);
        });
    });

    // --- Cache ---
    describe('cache WeakMap', () => {
        it('doit retourner le résultat en cache pour la même référence objet', () => {
            const resource = makeResource({
                startDate: '2025-06-01',
                endDate: '2025-06-30',
                country: Country.PT,
            });

            const stats1 = getCachedResourceStats(resource, 2025);
            const stats2 = getCachedResourceStats(resource, 2025);

            // Même référence objet = même résultat en cache
            expect(stats1).toBe(stats2); // strict reference equality
        });

        it('doit recalculer pour une année différente', () => {
            const resource = makeResource({
                startDate: '2024-01-01',
                endDate: '2025-12-31',
                country: Country.PT,
            });

            const stats2025 = getCachedResourceStats(resource, 2025);
            const stats2024 = getCachedResourceStats(resource, 2024);

            // Année différente = recalcul
            expect(stats2025).not.toBe(stats2024);
        });

        it('doit recalculer pour un objet ressource différent', () => {
            const resource1 = makeResource({ tjm: 500 });
            const resource2 = makeResource({ tjm: 500 }); // Same data, different object

            const stats1 = getCachedResourceStats(resource1, 2025);
            const stats2 = getCachedResourceStats(resource2, 2025);

            // Objets différents = recalcul (WeakMap keyed by reference)
            expect(stats1).not.toBe(stats2);
            // Mais mêmes valeurs
            expect(stats1.days).toBe(stats2.days);
        });
    });
});
