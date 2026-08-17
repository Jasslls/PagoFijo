import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { InvoiceStatus } from "../models/types";
import { lightColors, useAppColors } from "../themes/colors";
import { Image } from "expo-image";

function badgeStyle(status: InvoiceStatus, colors: any) {
    if (status === "Vencida") return { bg: colors.danger + "1A", fg: colors.danger };
    if (status === "Cobrada") return { bg: colors.success + "1A", fg: colors.success };
    return { bg: colors.warning + "1A", fg: colors.warning };
}

function parseMoneyNum(amountStr: string): number {
    const clean = amountStr.replace(/[^0-9.]/g, "");
    return parseFloat(clean) || 0;
}

function formatMoney(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function InvoiceCard({
    id,
    clientName,
    desc,
    amount,
    dueLabel,
    status,
    onEdit,
    onDelete,
    onMarkPaid,
    onShare,
    onWhatsApp,
    proofUri,
    compact,
    isRecurring,
    paidAmount,
    onPressCard,
}: {
    id: string;
    clientName: string;
    desc: string;
    amount: string;
    dueLabel: string;
    status: InvoiceStatus;
    onEdit?: () => void;
    onDelete?: () => void;
    onMarkPaid?: () => void;
    onShare?: () => void;
    onWhatsApp?: () => void;
    proofUri?: string;
    compact?: boolean;
    isRecurring?: boolean;
    paidAmount?: number;
    onPressCard?: () => void;
}) {
    const colors = useAppColors();
    const styles = getStyles(colors);
    const b = badgeStyle(status, colors);
    const canMarkPaid = status !== "Cobrada";

    const totalNum = parseMoneyNum(amount);
    const paidNum = paidAmount || 0;
    const remainingNum = Math.max(0, totalNum - paidNum);
    const hasAbonos = paidNum > 0 && status !== "Cobrada";
    const percentPaid = totalNum > 0 ? Math.min(100, Math.round((paidNum / totalNum) * 100)) : 0;

    const displayClientName = clientName || "Cobro General";

    if (compact) {
        return (
            <Pressable onPress={onPressCard} style={({ pressed }) => [styles.card, styles.cardCompact, pressed && { opacity: 0.9 }]}>
                <View style={styles.compactRow}>
                    <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {isRecurring && <MaterialIcons name="event-repeat" size={16} color={colors.primary} />}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.id, { fontSize: 13 }]} numberOfLines={1}>{displayClientName}</Text>
                            <Text style={[styles.client, { fontSize: 11 }]} numberOfLines={1}>#{id}</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.amount, { fontSize: 14 }]}>
                            {hasAbonos ? formatMoney(remainingNum) : amount}
                        </Text>
                        {hasAbonos && (
                            <Text style={styles.compactAbonoHint}>
                                Abono: {formatMoney(paidNum)} / {amount}
                            </Text>
                        )}
                        <View style={[styles.badge, { backgroundColor: b.bg, paddingVertical: 2, paddingHorizontal: 6, marginTop: 2 }]}>
                            <Text style={[styles.badgeText, { color: b.fg, fontSize: 10 }]}>{status}</Text>
                        </View>
                    </View>
                </View>

                {hasAbonos && (
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${percentPaid}%`, backgroundColor: colors.success }]} />
                    </View>
                )}

                <View style={[styles.compactActions, { marginTop: 8 }]}>
                    <Text style={[styles.due, { flex: 1, fontSize: 11, marginTop: 0 }]}>{dueLabel}</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                        {onWhatsApp && (
                            <Pressable onPress={onWhatsApp} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }, { paddingHorizontal: 6, paddingVertical: 4 }]}>
                                <MaterialIcons name="notifications-none" size={18} color={colors.primary} />
                            </Pressable>
                        )}
                        <Pressable onPress={onShare} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }, { paddingHorizontal: 6, paddingVertical: 4 }]}>
                            <Text style={{ fontSize: 14 }}>📤</Text>
                        </Pressable>
                        <Pressable onPress={onEdit} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }, { paddingHorizontal: 6, paddingVertical: 4 }]}>
                            <Text style={{ fontSize: 14 }}>✎</Text>
                        </Pressable>
                        <Pressable onPress={onDelete} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }, { paddingHorizontal: 6, paddingVertical: 4 }]}>
                            <Text style={[{ fontSize: 14, color: colors.danger }]}>🗑</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        );
    }

    return (
        <Pressable onPress={onPressCard} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
            <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {isRecurring && <MaterialIcons name="event-repeat" size={18} color={colors.primary} />}
                        <Text style={styles.id} numberOfLines={2}>{displayClientName}</Text>
                    </View>
                    <Text style={styles.client} numberOfLines={1}>#{id}</Text>
                </View>

                <View style={styles.actions}>
                    {onWhatsApp && (
                        <Pressable onPress={onWhatsApp} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
                            <MaterialIcons name="notifications-none" size={20} color={colors.primary} />
                        </Pressable>
                    )}
                    <Pressable onPress={onShare} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
                        <Text style={styles.actionText}>📤</Text>
                    </Pressable>
                    <Pressable onPress={onEdit} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
                        <Text style={styles.actionText}>✎</Text>
                    </Pressable>
                    <Pressable onPress={onDelete} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}>
                        <Text style={[styles.actionText, { color: colors.danger }]}>🗑</Text>
                    </Pressable>
                </View>
            </View>

            <Text style={styles.desc}>{desc}</Text>

            {/* If partial payments exist, show breakdown */}
            {hasAbonos && (
                <View style={styles.abonoBreakdown}>
                    <View style={styles.abonoRow}>
                        <Text style={styles.abonoLabel}>Total: <Text style={{ fontWeight: "700", color: colors.text }}>{amount}</Text></Text>
                        <Text style={styles.abonoLabel}>Abonado: <Text style={{ fontWeight: "800", color: colors.success }}>{formatMoney(paidNum)}</Text></Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${percentPaid}%`, backgroundColor: colors.success }]} />
                    </View>
                </View>
            )}

            <View style={styles.bottomRow}>
                <View>
                    {hasAbonos ? (
                        <>
                            <Text style={styles.saldoLabel}>Resta por cobrar</Text>
                            <Text style={[styles.amount, { color: status === "Vencida" ? colors.danger : colors.text }]}>
                                {formatMoney(remainingNum)}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.amount}>{amount}</Text>
                    )}
                </View>

                <View style={styles.meta}>
                    <Text style={styles.due}>{dueLabel}</Text>

                    <View style={styles.metaRow}>
                        {proofUri && (
                            <View style={styles.proofContainer}>
                                <Image 
                                    source={{ uri: proofUri }} 
                                    style={styles.proofThumb}
                                    contentFit="cover"
                                />
                                <View style={styles.proofBadge}>
                                    <Text style={{ fontSize: 10 }}>📄</Text>
                                </View>
                            </View>
                        )}
                        <View style={[styles.badge, { backgroundColor: b.bg }]}>
                            <Text style={[styles.badgeText, { color: b.fg }]}>{status}</Text>
                        </View>

                        {canMarkPaid && (
                            <Pressable
                                onPress={onMarkPaid}
                                style={({ pressed }) => [styles.paidBtn, pressed && { opacity: 0.85 }]}
                            >
                                <Text style={styles.paidBtnText}>✓ Cobrar</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardCompact: {
        padding: 10,
    },
    compactRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    compactAbonoHint: {
        fontSize: 10,
        color: colors.muted,
        fontWeight: "600",
        marginTop: 1,
    },
    compactActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 8,
    },
    topRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    actions: { flexDirection: "row", gap: 4 },
    actionBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    actionText: { fontSize: 15, color: colors.text },

    id: { color: colors.text, fontWeight: "900", fontSize: 15 },
    client: { color: colors.muted, marginTop: 2, fontWeight: "600", fontSize: 12 },

    desc: { color: colors.text, marginTop: 8, fontWeight: "500", fontSize: 14 },

    abonoBreakdown: {
        backgroundColor: colors.bg,
        borderRadius: 8,
        padding: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    abonoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    abonoLabel: {
        fontSize: 12,
        color: colors.muted,
    },
    progressBarBg: {
        height: 5,
        backgroundColor: colors.border,
        borderRadius: 3,
        overflow: "hidden",
        width: "100%",
        marginTop: 4,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 3,
    },

    saldoLabel: {
        fontSize: 11,
        color: colors.muted,
        fontWeight: "700",
        marginBottom: 1,
    },

    bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 },
    amount: { color: colors.text, fontWeight: "900", fontSize: 17 },

    meta: { alignItems: "flex-end", gap: 6 },
    due: { color: colors.muted, fontWeight: "700", fontSize: 12 },

    metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },

    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    badgeText: { fontWeight: "900", fontSize: 12 },
    
    proofContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.border,
        overflow: "hidden",
        position: "relative"
    },
    proofThumb: { width: "100%", height: "100%" },
    proofBadge: {
        position: "absolute",
        bottom: -2,
        right: -2,
        backgroundColor: "#fff",
        borderRadius: 6,
        padding: 2,
        borderWidth: 1,
        borderColor: colors.border
    },

    paidBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.success,
        backgroundColor: colors.success + "14",
    },
    paidBtnText: { fontWeight: "900", fontSize: 12, color: colors.success },
});
