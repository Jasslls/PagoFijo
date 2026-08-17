import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "firebase/firestore";
import type { Activity, Client, Invoice } from "../models/types";
import { GENERAL_CLIENT_ID } from "../models/types";
import { db } from "./firebase";


const userDoc = (uid: string) => doc(db, "users", uid);
const clientsColl = (uid: string) => collection(userDoc(uid), "clients");
const invoicesColl = (uid: string, clientId: string) => collection(doc(clientsColl(uid), clientId), "invoices");
const paymentsColl = (uid: string, clientId: string, invoiceId: string) =>
    collection(doc(invoicesColl(uid, clientId), invoiceId), "payments");

// General invoices (no client) — stored directly under user
const generalInvoicesColl = (uid: string) => collection(userDoc(uid), "generalInvoices");

export async function updateUserSettings(uid: string, settings: any): Promise<void> {
    const ref = userDoc(uid);
    await updateDoc(ref, { settings });
}

export async function updateUserProfile(uid: string, data: { name?: string; phone?: string; businessName?: string }): Promise<void> {
    const ref = userDoc(uid);
    await updateDoc(ref, data);
}


export async function getClients(uid: string): Promise<Client[]> {
    const q = query(clientsColl(uid), orderBy("name", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
}

export async function addClient(uid: string, client: Omit<Client, "id">): Promise<string> {
    const docRef = await addDoc(clientsColl(uid), {
        ...client,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateClient(uid: string, clientId: string, data: Partial<Omit<Client, "id">>): Promise<void> {
    const ref = doc(clientsColl(uid), clientId);
    await updateDoc(ref, data);
}

export async function deleteClient(uid: string, clientId: string): Promise<void> {
    const ref = doc(clientsColl(uid), clientId);
    await deleteDoc(ref);
}


// ─── Invoices (client-specific + general) ────────────────────────────────────

function isGeneralInvoice(clientId: string): boolean {
    return !clientId || clientId === GENERAL_CLIENT_ID;
}

export async function getAllInvoices(uid: string): Promise<Invoice[]> {
    const clients = await getClients(uid);

    // Fetch client invoices + general invoices in parallel
    const clientPromises = clients.map(async (client) => {
        const q = query(invoicesColl(uid, client.id));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, clientId: client.id, ...d.data() } as Invoice));
    });

    const generalPromise = (async () => {
        const q = query(generalInvoicesColl(uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, clientId: GENERAL_CLIENT_ID, ...d.data() } as Invoice));
    })();

    const [clientResults, generalResults] = await Promise.all([
        Promise.all(clientPromises),
        generalPromise
    ]);

    const allClientInvoices = clientResults.reduce((acc: Invoice[], arr: Invoice[]) => acc.concat(arr), []);
    return allClientInvoices.concat(generalResults);
}

export async function getInvoicesByClient(uid: string, clientId: string): Promise<Invoice[]> {
    if (isGeneralInvoice(clientId)) {
        const q = query(generalInvoicesColl(uid));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, clientId: GENERAL_CLIENT_ID, ...d.data() } as Invoice));
    }
    const q = query(invoicesColl(uid, clientId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, clientId, ...d.data() } as Invoice));
}

export async function addInvoice(uid: string, clientId: string, invoice: Omit<Invoice, "id" | "clientId">): Promise<string> {
    if (isGeneralInvoice(clientId)) {
        const docRef = await addDoc(generalInvoicesColl(uid), {
            ...invoice,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    }
    const docRef = await addDoc(invoicesColl(uid, clientId), {
        ...invoice,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateInvoice(uid: string, clientId: string, invoiceId: string, data: Partial<Omit<Invoice, "id" | "clientId">>): Promise<void> {
    if (isGeneralInvoice(clientId)) {
        const ref = doc(generalInvoicesColl(uid), invoiceId);
        await updateDoc(ref, data);
        return;
    }
    const ref = doc(invoicesColl(uid, clientId), invoiceId);
    await updateDoc(ref, data);
}

export async function deleteInvoice(uid: string, clientId: string, invoiceId: string): Promise<void> {
    if (isGeneralInvoice(clientId)) {
        const ref = doc(generalInvoicesColl(uid), invoiceId);
        await deleteDoc(ref);
        return;
    }
    const ref = doc(invoicesColl(uid, clientId), invoiceId);
    await deleteDoc(ref);
}


const activityColl = (uid: string) => collection(userDoc(uid), "activity");

export async function getActivities(uid: string): Promise<Activity[]> {
    const q = query(activityColl(uid), orderBy("ts", "desc"), where("ts", ">", "")); // o similar
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
}

export async function getInvoiceActivities(uid: string, invoiceId: string): Promise<Activity[]> {
    const q = query(activityColl(uid), where("invoiceId", "==", invoiceId));
    const snap = await getDocs(q);
    const activities = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
    return activities.sort((a, b) => b.ts.localeCompare(a.ts));
}

export async function pushActivity(uid: string, activity: Omit<Activity, "id">): Promise<void> {
    await addDoc(activityColl(uid), activity);
}
