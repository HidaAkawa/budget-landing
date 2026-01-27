import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    writeBatch,
    getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { CalendarTemplate, Country } from "@/types";

const COLLECTION_NAME = "calendar_templates";

export const calendarService = {
    /**
     * Fetch all calendar templates.
     */
    async getAllTemplates(): Promise<CalendarTemplate[]> {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CalendarTemplate));
    },

    /**
     * Fetch templates for a specific country.
     */
    async getTemplatesByCountry(country: Country): Promise<CalendarTemplate[]> {
        const q = query(collection(db, COLLECTION_NAME), where("country", "==", country));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as CalendarTemplate));
    },

    /**
     * Fetch a specific template by ID.
     */
    async getTemplateById(id: string): Promise<CalendarTemplate | null> {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as CalendarTemplate;
        }
        return null;
    },

    /**
     * Create a new template. 
     * If isDefault is true, it unsets other defaults for that country.
     */
    async createTemplate(template: Omit<CalendarTemplate, "id">): Promise<string> {
        if (template.isDefault) {
            await this.unsetDefaultsForCountry(template.country);
        }

        const docRef = await addDoc(collection(db, COLLECTION_NAME), template);
        return docRef.id;
    },

    /**
     * Update a template.
     */
    async updateTemplate(id: string, updates: Partial<CalendarTemplate>): Promise<void> {
        // If we are setting this template as default, ensure others are unset
        if (updates.isDefault) {
             let country = updates.country;
             
             // If country is not in updates, we need to fetch the existing doc to know the country
             if (!country) {
                 const existingDoc = await this.getTemplateById(id);
                 if (existingDoc) {
                     country = existingDoc.country;
                 }
             }

             if (country) {
                 await this.unsetDefaultsForCountry(country, id);
             }
        }

        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, updates);
    },

    /**
     * Delete a template.
     */
    async deleteTemplate(id: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    },

    /**
     * Helper to unset isDefault for all templates of a country (except one optionally).
     */
    async unsetDefaultsForCountry(country: Country, excludeId?: string) {
        const q = query(
            collection(db, COLLECTION_NAME), 
            where("country", "==", country), 
            where("isDefault", "==", true)
        );
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        let hasUpdates = false;

        snapshot.docs.forEach(d => {
            if (d.id !== excludeId) {
                batch.update(doc(db, COLLECTION_NAME, d.id), { isDefault: false });
                hasUpdates = true;
            }
        });
        
        if (hasUpdates) {
            await batch.commit();
        }
    }
};
