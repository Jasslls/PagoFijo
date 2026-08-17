import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActionSheetIOS,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import type { Client, Invoice, InvoiceRecurrence, InvoiceStatus } from "../models/types";
import { GENERAL_CLIENT_ID } from "../models/types";
import { setItem } from "../services/storage";
import { lightColors, useAppColors } from "../themes/colors";
import { DateField } from "./DateField";
import { usePremium } from "../hooks/usePremium";
import { PaywallModal } from "./PaywallModal";


export async function compressImageWeb(uri: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.src = uri;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(uri);
                return;
            }

            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            resolve(dataUrl);
        };
        img.onerror = () => {
            resolve(uri);
        };
    });
}

type Form = {
    clientId: string;
    desc: string;
    amount: string;
    due: string;
    status: InvoiceStatus;
    recurrence: InvoiceRecurrence;
    photoUri: string;
};

const KEY_CLIENTS_INTENT = "clients_intent_open_new_v1";

function onlyDigits(s: string) {
    return s.replace(/[^\d.]/g, "");
}

function isValidYYYYMMDD(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function InvoiceFormModal({
    visible,
    onClose,
    onSave,
    clients,
    initial,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: Omit<Invoice, "id"> & { id?: string }) => Promise<void>;
    clients: Client[];
    initial?: Invoice | null;
}) {
    const colors = useAppColors();
    const styles = getStyles(colors);
    const { isPremium } = usePremium();
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const [clientSelectorOpen, setClientSelectorOpen] = useState(false);

    const [form, setForm] = useState<Form>({
        clientId: GENERAL_CLIENT_ID,
        desc: "",
        amount: "",
        due: getTodayString(),
        status: "Pendiente",
        recurrence: "none",
        photoUri: "",
    });

    useEffect(() => {
        if (!visible) return;

        setClientSearch("");
        setClientSelectorOpen(false);

        if (initial) {
            setForm({
                clientId: initial.clientId || GENERAL_CLIENT_ID,
                desc: initial.desc ?? "",
                amount: String(initial.amount ?? ""),
                due: initial.due ?? getTodayString(),
                status: initial.status,
                recurrence: initial.recurrence || "none",
                photoUri: initial.proofUri ?? "",
            });
            return;
        }

        // On new invoice: NO client selected by default (starts as general/unassigned)
        setForm({
            clientId: GENERAL_CLIENT_ID,
            desc: "",
            amount: "",
            due: getTodayString(),
            status: "Pendiente",
            recurrence: "none",
            photoUri: "",
        });
    }, [visible, initial]);

    const filteredClients = useMemo(() => {
        const q = clientSearch.trim().toLowerCase();
        if (!q) return clients;
        return clients.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.company && c.company.toLowerCase().includes(q)) ||
                (c.phone && c.phone.includes(q))
        );
    }, [clients, clientSearch]);

    const selectedClient = useMemo(() => {
        if (!form.clientId || form.clientId === GENERAL_CLIENT_ID) return null;
        return clients.find((c) => c.id === form.clientId) || null;
    }, [clients, form.clientId]);

    function set<K extends keyof Form>(k: K, v: Form[K]) {
        if (k === "recurrence" && v !== "none" && !isPremium) {
            setPaywallVisible(true);
            return;
        }

        setForm((p) => {
            const next = { ...p, [k]: v };
            
            if (k === "due") {
                const today = getTodayString();
                if (v > today && next.status === "Vencida") {
                    next.status = "Pendiente";
                }
            }
            
            return next;
        });
    }

    // ── Foto: picker ──────────────────────────────────────────
    async function pickFromGallery() {
        if (Platform.OS !== "web") {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería para adjuntar fotos.");
                return;
            }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            if (Platform.OS === "web") {
                const compressed = await compressImageWeb(asset.uri);
                setForm((p) => ({ ...p, photoUri: compressed }));
            } else {
                const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                setForm((p) => ({ ...p, photoUri: uri }));
            }
        }
    }

    async function pickFromCamera() {
        if (Platform.OS !== "web") {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara para tomar fotos.");
                return;
            }
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            if (Platform.OS === "web") {
                const compressed = await compressImageWeb(asset.uri);
                setForm((p) => ({ ...p, photoUri: compressed }));
            } else {
                const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                setForm((p) => ({ ...p, photoUri: uri }));
            }
        }
    }

    function handlePhotoPress() {
        if (Platform.OS === "web") {
            if (form.photoUri) {
                if (window.confirm("¿Deseas eliminar la foto actual? Presiona Cancelar si deseas seleccionar otra.")) {
                    setForm((p) => ({ ...p, photoUri: "" }));
                } else {
                    pickFromGallery();
                }
            } else {
                pickFromGallery();
            }
            return;
        }

        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ["Cancelar", "Tomar foto", "Elegir de galería", ...(form.photoUri ? ["Eliminar foto"] : [])],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: form.photoUri ? 3 : undefined,
                },
                (idx) => {
                    if (idx === 1) pickFromCamera();
                    else if (idx === 2) pickFromGallery();
                    else if (idx === 3 && form.photoUri) setForm((p) => ({ ...p, photoUri: "" }));
                }
            );
        } else {
            Alert.alert(
                "Adjuntar foto",
                "¿Cómo quieres agregar la foto?",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "📷 Tomar foto", onPress: pickFromCamera },
                    { text: "🖼 Elegir de galería", onPress: pickFromGallery },
                    ...(form.photoUri
                        ? [{ text: "🗑 Eliminar foto", style: "destructive" as const, onPress: () => setForm((p) => ({ ...p, photoUri: "" })) }]
                        : []),
                ]
            );
        }
    }

    async function save() {
        if (saving) return;

        const amt = Number(form.amount);
        if (!form.desc.trim()) {
            const msg = "Ingresa una descripción o concepto del cobro.";
            if (Platform.OS === "web") alert(msg);
            else Alert.alert("Falta información", msg);
            return;
        }
        if (!Number.isFinite(amt) || amt <= 0) {
            const msg = "Ingresa un monto válido mayor a 0.";
            if (Platform.OS === "web") alert(msg);
            else Alert.alert("Monto inválido", msg);
            return;
        }
        if (!isValidYYYYMMDD(form.due)) {
            const msg = "Ingresa una fecha de vencimiento válida (AAAA-MM-DD).";
            if (Platform.OS === "web") alert(msg);
            else Alert.alert("Fecha inválida", msg);
            return;
        }

        const effectiveClientId = form.clientId || GENERAL_CLIENT_ID;

        setSaving(true);
        try {
            await onSave({
                id: initial?.id,
                clientId: effectiveClientId,
                desc: form.desc.trim(),
                amount: amt,
                due: form.due,
                status: form.status,
                recurrence: form.recurrence,
                proofUri: form.photoUri || undefined,
            });
            onClose();
        } catch (err: any) {
            if (err?.message !== "PAYWALL_BLOCKED") {
                console.error("Error saving invoice from modal:", err);
                const msg = err?.message || String(err);
                if (Platform.OS === "web") {
                    alert("Error al guardar: " + msg);
                } else {
                    Alert.alert("Error", "No se pudo guardar la factura: " + msg);
                }
            }
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    style={{ width: "100%" }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
                >
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <Text style={styles.title}>{initial ? "Editar Factura / Cobro" : "Nueva Factura / Cobro"}</Text>
                            <Pressable onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color={colors.muted} />
                            </Pressable>
                        </View>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 16 }}
                        >
                            {/* ── Selector de Cliente con Buscador ── */}
                            <Text style={styles.label}>Cliente (Opcional)</Text>
                            
                            <View style={styles.clientPickerContainer}>
                                <Pressable
                                    onPress={() => setClientSelectorOpen(!clientSelectorOpen)}
                                    style={[
                                        styles.selectedClientButton,
                                        selectedClient ? styles.selectedClientActive : null,
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.selectedClientText, !selectedClient && { color: colors.muted }]}>
                                            {selectedClient ? selectedClient.name : "Sin cliente (Cobro General)"}
                                        </Text>
                                        {selectedClient?.company && (
                                            <Text style={styles.selectedClientSub}>{selectedClient.company}</Text>
                                        )}
                                    </View>
                                    <Ionicons 
                                        name={clientSelectorOpen ? "chevron-up" : "chevron-down"} 
                                        size={18} 
                                        color={colors.primary} 
                                    />
                                </Pressable>

                                {clientSelectorOpen && (
                                    <View style={styles.clientDropdown}>
                                        {clients.length > 3 && (
                                            <View style={styles.clientSearchBox}>
                                                <Ionicons name="search" size={16} color={colors.muted} style={{ marginRight: 6 }} />
                                                <TextInput
                                                    value={clientSearch}
                                                    onChangeText={setClientSearch}
                                                    placeholder="Buscar cliente..."
                                                    placeholderTextColor={colors.muted}
                                                    style={styles.clientSearchInput}
                                                    autoCapitalize="none"
                                                />
                                                {clientSearch ? (
                                                    <Pressable onPress={() => setClientSearch("")}>
                                                        <Ionicons name="close-circle" size={16} color={colors.muted} />
                                                    </Pressable>
                                                ) : null}
                                            </View>
                                        )}

                                        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                                            {/* Opción Sin Cliente siempre al inicio */}
                                            <Pressable
                                                onPress={() => {
                                                    set("clientId", GENERAL_CLIENT_ID);
                                                    setClientSelectorOpen(false);
                                                }}
                                                style={[
                                                    styles.clientOption,
                                                    (!form.clientId || form.clientId === GENERAL_CLIENT_ID) && styles.clientOptionActive,
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.clientOptionName,
                                                    (!form.clientId || form.clientId === GENERAL_CLIENT_ID) && { color: colors.primary, fontWeight: "800" },
                                                ]}>
                                                    ✨ Sin cliente (Cobro General)
                                                </Text>
                                            </Pressable>

                                            {filteredClients.map((c) => {
                                                const isSel = c.id === form.clientId;
                                                return (
                                                    <Pressable
                                                        key={c.id}
                                                        onPress={() => {
                                                            set("clientId", c.id);
                                                            setClientSelectorOpen(false);
                                                        }}
                                                        style={[styles.clientOption, isSel && styles.clientOptionActive]}
                                                    >
                                                        <View>
                                                            <Text style={[styles.clientOptionName, isSel && { color: colors.primary, fontWeight: "800" }]}>
                                                                {c.name}
                                                            </Text>
                                                            {c.company ? (
                                                                <Text style={styles.clientOptionCompany}>{c.company}</Text>
                                                            ) : null}
                                                        </View>
                                                        {isSel && (
                                                            <Ionicons name="checkmark" size={16} color={colors.primary} />
                                                        )}
                                                    </Pressable>
                                                );
                                            })}

                                            {filteredClients.length === 0 && (
                                                <Text style={styles.noClientsFound}>No se encontraron clientes</Text>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.label}>Descripción / Concepto *</Text>
                            <TextInput
                                value={form.desc}
                                onChangeText={(v) => set("desc", v)}
                                style={styles.input}
                                placeholder="Ej: Servicio de mantenimiento, Venta producto..."
                                placeholderTextColor={colors.muted}
                            />

                            <Text style={styles.label}>Monto (USD) *</Text>
                            <TextInput
                                value={form.amount}
                                onChangeText={(v) => set("amount", onlyDigits(v))}
                                style={styles.input}
                                keyboardType="decimal-pad"
                                placeholder="Ej: 1500.00"
                                placeholderTextColor={colors.muted}
                            />

                            {/* Calendario */}
                            <DateField label="Fecha de Vencimiento" value={form.due} onChange={(ymd) => set("due", ymd)} />

                            <Text style={styles.label}>Estado</Text>
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                                {((form.due > getTodayString() ? ["Pendiente"] : ["Pendiente", "Vencida", "Cobrada"]) as InvoiceStatus[]).map((s) => {
                                    const active = s === form.status;
                                    return (
                                        <Pressable
                                            key={s}
                                            onPress={() => set("status", s)}
                                            style={[
                                                styles.pill,
                                                {
                                                    borderColor: active ? colors.primary : colors.border,
                                                    backgroundColor: active ? colors.primary + "1A" : "transparent",
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.pillText, { color: active ? colors.primary : colors.text }]}>
                                                {s}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <Text style={styles.label}>Facturación Recurrente</Text>
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                                {[
                                    { val: "none", label: "Ninguna" },
                                    { val: "semanal", label: "Semanal" },
                                    { val: "mensual", label: "Mensual" },
                                    { val: "anual", label: "Anual" },
                                ].map((opt) => {
                                    const active = opt.val === form.recurrence;
                                    return (
                                        <Pressable
                                            key={opt.val}
                                            onPress={() => set("recurrence", opt.val as InvoiceRecurrence)}
                                            style={[
                                                styles.pill,
                                                {
                                                    borderColor: active ? colors.primary : colors.border,
                                                    backgroundColor: active ? colors.primary + "1A" : "transparent",
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.pillText, { color: active ? colors.primary : colors.text }]}>
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            
                            {form.recurrence !== "none" && (
                                <Text style={styles.recurrenceHint}>
                                    ⏱ Se creará una nueva factura automáticamente cada {
                                        form.recurrence === "semanal" ? "semana" : 
                                        form.recurrence === "mensual" ? "mes" : "año"
                                    } después de la fecha de vencimiento inicial.
                                </Text>
                            )}

                            {/* ── Fotografía ─────────────────────────────────── */}
                            <Text style={styles.label}>📷 Foto / Comprobante (opcional)</Text>
                            <TouchableOpacity
                                onPress={handlePhotoPress}
                                style={[
                                    styles.photoBox,
                                    form.photoUri ? styles.photoBoxFilled : null,
                                ]}
                                activeOpacity={0.75}
                            >
                                {form.photoUri ? (
                                    <>
                                        <Image
                                            source={{ uri: form.photoUri }}
                                            style={styles.photoPreview}
                                            resizeMode="cover"
                                        />
                                        <View style={styles.photoEditBadge}>
                                            <Text style={styles.photoEditBadgeText}>✏️ Cambiar foto</Text>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Text style={styles.photoPlaceholderIcon}>📷</Text>
                                        <Text style={styles.photoPlaceholderText}>Tomar foto o elegir de galería</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </ScrollView>

                        <View style={styles.footer}>
                            <Pressable onPress={onClose} style={styles.cancel} disabled={saving}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </Pressable>

                            <Pressable onPress={() => void save()} style={[styles.save, saving && { opacity: 0.6 }]} disabled={saving}>
                                <Text style={styles.saveText}>{saving ? "Guardando..." : "Guardar Factura"}</Text>
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>

        <PaywallModal 
            visible={paywallVisible} 
            onClose={() => setPaywallVisible(false)} 
            onActivated={() => setPaywallVisible(false)}
        />
        </>
    );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 },
    card: { backgroundColor: colors.card, borderRadius: 18, padding: 18, maxHeight: "90%" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    closeBtn: { padding: 4 },

    label: { color: colors.muted, fontWeight: "800", marginTop: 12, marginBottom: 6, fontSize: 13 },
    
    // Client picker & search
    clientPickerContainer: { marginBottom: 4 },
    selectedClientButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.bg,
    },
    selectedClientActive: {
        borderColor: colors.primary + "80",
    },
    selectedClientText: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    selectedClientSub: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 2,
    },
    clientDropdown: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        marginTop: 6,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    clientSearchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 38,
        marginBottom: 8,
    },
    clientSearchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        padding: 0,
    },
    clientOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    clientOptionActive: {
        backgroundColor: colors.primary + "12",
    },
    clientOptionName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
    },
    clientOptionCompany: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 1,
    },
    noClientsFound: {
        textAlign: "center",
        color: colors.muted,
        fontSize: 13,
        paddingVertical: 12,
    },

    recurrenceHint: { 
        backgroundColor: colors.primary + "15", 
        color: colors.primary, 
        padding: 10, 
        borderRadius: 8, 
        fontWeight: "600",
        fontSize: 13,
        overflow: "hidden",
        marginBottom: 8,
    },

    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        fontSize: 16, // >= 16 prevents mobile browser auto-zoom!
        color: colors.text,
        backgroundColor: colors.bg,
    },

    pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
    pillText: { fontWeight: "800", fontSize: 13 },

    footer: {
        flexDirection: "row",
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    cancel: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        alignItems: "center",
        paddingVertical: 13,
    },
    cancelText: { color: colors.text, fontWeight: "800", fontSize: 15 },
    save: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, alignItems: "center", paddingVertical: 13 },
    saveText: { color: "#fff", fontWeight: "900", fontSize: 15 },

    // ── Foto ──────────────────────────────────────────────────
    photoBox: {
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 12,
        borderStyle: "dashed",
        overflow: "hidden",
        marginBottom: 10,
        minHeight: 100,
        backgroundColor: colors.bg,
    },
    photoBoxFilled: {
        borderStyle: "solid",
        borderColor: colors.primary + "60",
    },
    photoPreview: {
        width: "100%",
        height: 160,
    },
    photoPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 24,
        gap: 8,
    },
    photoPlaceholderIcon: { fontSize: 28 },
    photoPlaceholderText: {
        color: colors.muted,
        fontWeight: "700",
        fontSize: 13,
    },
    photoEditBadge: {
        position: "absolute",
        bottom: 8,
        right: 8,
        backgroundColor: "rgba(0,0,0,0.65)",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    photoEditBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});