import { db } from './firebase';
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs,
    writeBatch,
    onSnapshot,
    Unsubscribe
} from 'firebase/firestore';
import { Resource, OverrideValue } from '@/types';
import { eachDayOfInterval, format } from 'date-fns';

const SCENARIO_COLLECTION = 'scenarios';
const RESOURCES_SUBCOLLECTION = 'resources';

export const resourceService = {
    /**
     * Subscribe to resources for a specific scenario (Subcollection V2)
     */
    subscribeToResources: (scenarioId: string, onUpdate: (resources: Resource[]) => void, onError: (error: any) => void): Unsubscribe => {
        const resourcesRef = collection(db, SCENARIO_COLLECTION, scenarioId, RESOURCES_SUBCOLLECTION);
        
        return onSnapshot(resourcesRef, (snapshot) => {
            const resources = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
            onUpdate(resources);
        }, onError);
    },

    /**
     * Fetch all resources for a scenario once (useful for calculations/cloning)
     */
    getResources: async (scenarioId: string): Promise<Resource[]> => {
        const resourcesRef = collection(db, SCENARIO_COLLECTION, scenarioId, RESOURCES_SUBCOLLECTION);
        const snapshot = await getDocs(resourcesRef);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Resource));
    },

    addResource: async (scenarioId: string, resource: Omit<Resource, 'id'>) => {
        const resourcesRef = collection(db, SCENARIO_COLLECTION, scenarioId, RESOURCES_SUBCOLLECTION);
        await addDoc(resourcesRef, resource);
    },

    updateResource: async (scenarioId: string, resourceId: string, updates: Partial<Resource>) => {
        const docRef = doc(db, SCENARIO_COLLECTION, scenarioId, RESOURCES_SUBCOLLECTION, resourceId);
        await updateDoc(docRef, updates);
    },

    deleteResource: async (scenarioId: string, resourceId: string) => {
        const docRef = doc(db, SCENARIO_COLLECTION, scenarioId, RESOURCES_SUBCOLLECTION, resourceId);
        await deleteDoc(docRef);
    },

    // Complex business logic updates
    updateResourceOverride: async (scenarioId: string, resource: Resource, date: string, value: OverrideValue | undefined) => {
        const newOverrides = { ...resource.overrides };
        if (value === undefined) delete newOverrides[date]; else newOverrides[date] = value;
        
        await resourceService.updateResource(scenarioId, resource.id, { overrides: newOverrides });
    },

    bulkUpdateResourceOverrides: async (scenarioId: string, resource: Resource, startDate: Date, endDate: Date, value: OverrideValue | undefined) => {
        const newOverrides = { ...resource.overrides };
        eachDayOfInterval({ start: startDate, end: endDate }).forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            if (value === undefined) delete newOverrides[dateStr]; else newOverrides[dateStr] = value;
        });
        
        await resourceService.updateResource(scenarioId, resource.id, { overrides: newOverrides });
    },

    applyResourceHolidays: async (scenarioId: string, resource: Resource, externalHolidays: string[]) => {
        const newOverrides = { ...resource.overrides };
        externalHolidays.forEach(d => newOverrides[d] = 0);
        const newDynamicHolidays = [...new Set([...(resource.dynamicHolidays || []), ...externalHolidays])];
        
        await resourceService.updateResource(scenarioId, resource.id, { 
            overrides: newOverrides, 
            dynamicHolidays: newDynamicHolidays 
        });
    },
    
    /**
     * COPY all resources from one scenario to another.
     * Used during Publish/Snapshot when we create a new Draft.
     */
    copyResources: async (sourceScenarioId: string, targetScenarioId: string) => {
        const resources = await resourceService.getResources(sourceScenarioId);
        const batch = writeBatch(db);
        
        resources.forEach(res => {
            // New ID or keep same? Usually new scenario = new documents to be independent.
            // We strip the ID to let Firestore generate a new one, or we can force a new ID.
            const { id, ...data } = res;
            const newDocRef = doc(collection(db, SCENARIO_COLLECTION, targetScenarioId, RESOURCES_SUBCOLLECTION));
            batch.set(newDocRef, data);
        });

        await batch.commit();
    }
};
