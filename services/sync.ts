import { getAllInvoices, getClients, addInvoice, updateInvoice, pushActivity } from "./firestore";
import { updateClientRiskFirestore } from "./riskEngine";
import { Invoice, InvoiceStatus, InvoiceRecurrence, GENERAL_CLIENT_ID } from "../models/types";

// Debounce: skip sync if it ran recently (within 30s)
let _lastSyncTime = 0;
const SYNC_DEBOUNCE_MS = 30_000;

function getTodayYMD() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
}

function addTime(dateStr: string, recurrence: InvoiceRecurrence): string {
    const d = new Date(dateStr + "T00:00:00");
    if (recurrence === "semanal") {
        d.setDate(d.getDate() + 7);
    } else if (recurrence === "mensual") {
        d.setMonth(d.getMonth() + 1);
    } else if (recurrence === "anual") {
        d.setFullYear(d.getFullYear() + 1);
    }
    return d.toISOString().split("T")[0];
}

export async function syncBusinessIntelligence(uid: string, force = false) {
    const now = Date.now();
    if (!force && now - _lastSyncTime < SYNC_DEBOUNCE_MS) {
        return;
    }
    _lastSyncTime = now;

    try {
        console.log("Starting BI Sync...");
        
        const clients = await getClients(uid);
        let allInvoices = await getAllInvoices(uid);
        const today = getTodayYMD();
        
        let newInvoicesAdded = false;

    for (const invoice of allInvoices) {
        if (invoice.recurrence && invoice.recurrence !== "none") {
                if (invoice.due > today) {
                    continue;
                }

                if (invoice.lastRecurrenceGeneratedDate && invoice.lastRecurrenceGeneratedDate > today) {
                    continue;
                }
                
                let lastGen = invoice.lastRecurrenceGeneratedDate || invoice.due;
                let maxIterations = 24;
                let finalGenDate = lastGen;
                
                while (lastGen <= today && maxIterations > 0) {
                    const nextDate = addTime(lastGen, invoice.recurrence);
                    maxIterations--;
                    
                    await addInvoice(uid, invoice.clientId, {
                        desc: invoice.desc,
                        amount: invoice.amount,
                        due: nextDate,
                        status: "Pendiente",
                        recurrence: "none",
                    });

                    lastGen = nextDate;
                    finalGenDate = nextDate;
                    newInvoicesAdded = true;
                }

                if (finalGenDate !== (invoice.lastRecurrenceGeneratedDate || invoice.due)) {
                    await updateInvoice(uid, invoice.clientId, invoice.id, {
                        lastRecurrenceGeneratedDate: finalGenDate,
                        // Maintain the recurrence flag on the original invoice
                    });
                }
            }
        }

        if (newInvoicesAdded) {
            allInvoices = await getAllInvoices(uid); // Refresh invoices after generation
        }

        const invoicesByClient: Record<string, Invoice[]> = {};
        for (const inv of allInvoices) {
            if (!invoicesByClient[inv.clientId]) {
                invoicesByClient[inv.clientId] = [];
            }
            invoicesByClient[inv.clientId].push(inv);
        }

        const riskPromises = clients.map(client => {
            const clientInvoices = invoicesByClient[client.id] || [];
            return updateClientRiskFirestore(uid, client.id, clientInvoices);
        });
        await Promise.all(riskPromises);

        console.log("BI Sync completed successfully.");
    } catch (error) {
        console.error("Error running BI Sync:", error);
    }
}
