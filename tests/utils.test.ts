import { describe, it, expect } from 'vitest';
import { calculateDayStatus } from '../utils';
import { Resource, Country } from '../types';

// Mock Resource Helper
const createMockResource = (overrides: Record<string, any> = {}): Resource => ({
    id: 'test-res',
    firstName: 'John',
    lastName: 'Doe',
    tjm: 500,
    country: Country.FR,
    ratioChange: 0,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    overrides: {},
    dynamicHolidays: [],
    ...overrides
});

describe('calculateDayStatus', () => {
    
    it('should return 1 for a regular week day', () => {
        const resource = createMockResource();
        const date = new Date('2024-06-12'); // Wednesday
        const status = calculateDayStatus(date, resource);
        
        expect(status.val).toBe(1);
        expect(status.isWknd).toBe(false);
        expect(status.isHoliday).toBe(false);
        expect(status.overrideActive).toBe(false);
        expect(status.isOutOfBounds).toBe(false);
    });

    it('should return 0 for a weekend', () => {
        const resource = createMockResource();
        const date = new Date('2024-06-15'); // Saturday
        const status = calculateDayStatus(date, resource);
        
        expect(status.val).toBe(0);
        expect(status.isWknd).toBe(true);
    });

    it('should return 0 for a dynamic holiday', () => {
        const resource = createMockResource({
            dynamicHolidays: ['2024-06-12']
        });
        const date = new Date('2024-06-12'); // Wednesday but holiday
        const status = calculateDayStatus(date, resource);
        
        expect(status.val).toBe(0);
        expect(status.isHoliday).toBe(true);
    });

    it('should respect overrides (forcing 0 on a work day)', () => {
        const resource = createMockResource({
            overrides: { '2024-06-12': 0 }
        });
        const date = new Date('2024-06-12'); // Wednesday
        const status = calculateDayStatus(date, resource);
        
        expect(status.val).toBe(0);
        expect(status.overrideActive).toBe(true);
    });

    it('should respect overrides (forcing 1 on a weekend)', () => {
        const resource = createMockResource({
            overrides: { '2024-06-15': 1 }
        });
        const date = new Date('2024-06-15'); // Saturday
        const status = calculateDayStatus(date, resource);
        
        expect(status.val).toBe(1);
        expect(status.overrideActive).toBe(true);
    });

    it('should return 0 if date is out of bounds (before start)', () => {
        const resource = createMockResource({
            startDate: '2024-06-01'
        });
        const date = new Date('2024-05-31');
        const status = calculateDayStatus(date, resource);
        
        expect(status.val).toBe(0);
        expect(status.isOutOfBounds).toBe(true);
    });

    it('should return 0 if date is out of bounds (after end)', () => {
        const resource = createMockResource({
            endDate: '2024-06-30'
        });
        const date = new Date('2024-07-01');
        const status = calculateDayStatus(date, resource);
        
        expect(status.val).toBe(0);
        expect(status.isOutOfBounds).toBe(true);
    });
});
