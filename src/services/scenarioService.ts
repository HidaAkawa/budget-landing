import { db } from './firebase';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc,
    Unsubscribe,
    writeBatch
} from 'firebase/firestore';
import { Scenario, ScenarioStatus } from '@/types';

const SCENARIO_COLLECTION = 'scenarios';

export const scenarioService = {
    /**
     * Subscribe to scenarios for a given user.
     * Sorts: Drafts first, then by updatedAt desc.
     */
    subscribeToScenarios: (userId: string, onUpdate: (scenarios: Scenario[]) => void, onError: (error: any) => void): Unsubscribe => {
        const q = query(
            collection(db, SCENARIO_COLLECTION), 
            where("ownerId", "==", userId)
        );

        return onSnapshot(q, (snapshot) => {
            const loadedDocs = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Scenario));
            // Sort: Drafts first, then by date desc
            loadedDocs.sort((a, b) => {
                if (a.status === ScenarioStatus.DRAFT && b.status !== ScenarioStatus.DRAFT) return -1;
                if (a.status !== ScenarioStatus.DRAFT && b.status === ScenarioStatus.DRAFT) return 1;
                return (b.updatedAt || 0) - (a.updatedAt || 0);
            });
            onUpdate(loadedDocs);
        }, onError);
    },

    createScenario: async (scenarioData: Omit<Scenario, 'id'>): Promise<string> => {
        const docRef = await addDoc(collection(db, SCENARIO_COLLECTION), {
            ...scenarioData,
            updatedAt: Date.now()
        });
        return docRef.id;
    },

    updateScenario: async (id: string, updates: Partial<Scenario>): Promise<void> => {
        const docRef = doc(db, SCENARIO_COLLECTION, id);
        await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    },

    deleteScenario: async (id: string): Promise<void> => {
        const docRef = doc(db, SCENARIO_COLLECTION, id);
        await deleteDoc(docRef);
    },
    
    // Batch operations for publishing (atomic update)
    publishScenario: async (draftId: string, userId: string, draftData: Scenario, currentMasters: Scenario[]): Promise<string> => {
        const batch = writeBatch(db);
        const now = Date.now();

        // 1. Archive current MASTERS
        currentMasters.forEach(v => {
            const ref = doc(db, SCENARIO_COLLECTION, v.id);
            batch.update(ref, { 
                status: ScenarioStatus.ARCHIVED,
                updatedAt: now 
            });
        });

        // 2. Promote current DRAFT to MASTER
        const newMasterRef = doc(db, SCENARIO_COLLECTION, draftId);
        batch.update(newMasterRef, { 
            status: ScenarioStatus.MASTER, 
            updatedAt: now 
        });

        // 3. Create NEW DRAFT immediately
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12); // Simple timestamp
        const username = draftData.ownerId ? 'USER' : 'USER'; // Can be improved
        const newDraftName = `DRAFT-${timestamp}`;

        const newDraftRef = doc(collection(db, SCENARIO_COLLECTION));
        const newDraftData = {
            name: newDraftName,
            status: ScenarioStatus.DRAFT,
            ownerId: userId,
            parentId: draftId,
            envelopes: draftData.envelopes,
            resources: [], // Resources will be copied separately via resourceService if needed, or keeping empty for V2
            createdAt: now,
            updatedAt: now,
        };
        
        batch.set(newDraftRef, newDraftData);

        // Note: For V2 with subcollections, we would also need to copy resources here. 
        // This might require a more complex server-side function or client-side iteration.
        // For this step (Decoupling), we keep the logic similar to existing but inside the service.
        
        await batch.commit();
        return newDraftRef.id;
    }
};
