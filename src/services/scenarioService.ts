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
     * Subscribe to scenarios using specific queries to minimize reads.
     * Pattern: Merge two disjoint queries (Public History + My Drafts).
     */
    subscribeToScenarios: (userId: string, onUpdate: (scenarios: Scenario[]) => void, onError: (error: Error) => void): Unsubscribe => {
        let publicScenarios: Scenario[] = [];
        let myDrafts: Scenario[] = [];

        // Helper to merge and sort
        const pushUpdate = () => {
            // Only push if we have initialized both listeners (avoid partial inconsistent state flashes)
            // Or push immediately for better responsiveness? Let's push immediately.
            const merged = [...publicScenarios, ...myDrafts];
            
            // Sort: Drafts first, then by date desc
            merged.sort((a, b) => {
                if (a.status === ScenarioStatus.DRAFT && b.status !== ScenarioStatus.DRAFT) return -1;
                if (a.status !== ScenarioStatus.DRAFT && b.status === ScenarioStatus.DRAFT) return 1;
                return (b.updatedAt || 0) - (a.updatedAt || 0);
            });
            
            onUpdate(merged);
        };

        // QUERY 1: Public History (Master + Archived)
        // We use 'in' operator to get both status in one query
        const qPublic = query(
            collection(db, SCENARIO_COLLECTION),
            where("status", "in", [ScenarioStatus.MASTER, ScenarioStatus.ARCHIVED])
        );

        const unsubPublic = onSnapshot(qPublic, (snapshot) => {
            publicScenarios = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Scenario));
            pushUpdate();
        }, onError);

        // QUERY 2: My Private Drafts
        const qDrafts = query(
            collection(db, SCENARIO_COLLECTION),
            where("ownerId", "==", userId),
            where("status", "==", ScenarioStatus.DRAFT)
        );

        const unsubDrafts = onSnapshot(qDrafts, (snapshot) => {
            myDrafts = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Scenario));
            pushUpdate();
        }, onError);

        // Return a function that unsubscribes from BOTH
        return () => {
            unsubPublic();
            unsubDrafts();
        };
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

        // 3. Create NEW DRAFT immediately for continuity
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12);
        const newDraftName = `DRAFT-${timestamp}`;

        const newDraftRef = doc(collection(db, SCENARIO_COLLECTION));
        const newDraftData = {
            name: newDraftName,
            status: ScenarioStatus.DRAFT,
            ownerId: userId, // The publisher becomes the owner of the new draft
            parentId: draftId,
            envelopes: draftData.envelopes,
            resources: [], 
            createdAt: now,
            updatedAt: now,
        };
        
        batch.set(newDraftRef, newDraftData);
        
        await batch.commit();
        return newDraftRef.id;
    }
};
