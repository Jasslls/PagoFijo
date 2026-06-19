import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { usePremium } from "../hooks/usePremium";
import { lightColors, useAppColors } from "../themes/colors";
import { PremiumWelcomeContent } from "./PremiumWelcomeModal";

const FEATURES = [
    { icon: "🤖", text: "Fijito — Asistente Financiero IA" },
    { icon: "✨", text: "Generación de mensajes con IA" },
    { icon: "📊", text: "Reportes y analíticas avanzadas" },
    { icon: "🎯", text: "Indicadores de Riesgo (Bajo/Medio/Alto)" },
    { icon: "🔁", text: "Facturas recurrentes (semanal/mensual/anual)" },
    { icon: "📈", text: "Expansión de registros (clientes y facturas)" },
    { icon: "🔔", text: "Notificaciones proactivas inteligentes" },
    { icon: "📷", text: "Fotografías en facturas y productos" },
];

interface Props {
    visible: boolean;
    onClose: () => void;
    onActivated?: () => void;
}

export function PaywallModal({ visible, onClose, onActivated }: Props) {
    const colors = useAppColors();
    const styles = getStyles(colors);
    const { activateLifetime, loading } = usePremium();

    const [activating, setActivating] = useState(false);
    const [welcomeVisible, setWelcomeVisible] = useState(false);

    const handleActivateFree = async () => {
        setActivating(true);
        try {
            await activateLifetime();
            setWelcomeVisible(true);
        } catch {
            if (Platform.OS === "web") {
                window.alert("Error: No se pudo activar el plan. Intenta de nuevo.");
            } else {
                Alert.alert("Error", "No se pudo activar el plan. Intenta de nuevo.");
            }
        } finally {
            setActivating(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.overlay, welcomeVisible && { justifyContent: "center" }]}>

                {welcomeVisible ? (
                    <View style={{ width: "100%", padding: 20 }}>
                        <PremiumWelcomeContent
                            onClose={() => {
                                setWelcomeVisible(false);
                                onActivated?.();
                                onClose();
                            }}
                        />
                    </View>
                ) : (
                    <View style={styles.sheet}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Pressable onPress={onClose} style={styles.closeBtn}>
                                <Text style={styles.closeText}>✕</Text>
                            </Pressable>
                            <Text style={styles.crown}>👑</Text>
                            <Text style={styles.headerTitle}>PagoFijo Premium</Text>
                            <Text style={styles.headerSub}>
                                Transforma tu cobranza con inteligencia artificial
                            </Text>

                            {/* Badge gratis */}
                            <View style={styles.freeBadge}>
                                <Text style={styles.freeBadgeText}>🎁 GRATIS DE POR VIDA</Text>
                            </View>
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.body}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.sectionLabel}>TODO LO QUE DESBLOQUEAS</Text>
                            {FEATURES.map((f, i) => (
                                <View key={i} style={styles.featureRow}>
                                    <Text style={styles.featureIcon}>{f.icon}</Text>
                                    <Text style={styles.featureText}>{f.text}</Text>
                                    <Text style={styles.check}>✓</Text>
                                </View>
                            ))}

                            {/* Destacado precio */}
                            <View style={styles.priceBox}>
                                <Text style={styles.priceStrike}>$4.99/mes</Text>
                                <Text style={styles.priceFree}>$0.00</Text>
                                <Text style={styles.priceLabel}>Para siempre · Sin tarjeta requerida</Text>
                            </View>

                            {/* CTA principal */}
                            <Pressable
                                onPress={handleActivateFree}
                                disabled={activating || loading}
                                style={({ pressed }) => [
                                    styles.ctaBtn,
                                    pressed && { opacity: 0.85 },
                                    (activating || loading) && { opacity: 0.6 },
                                ]}
                            >
                                {activating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.ctaBtnText}>
                                        🚀 Activar Premium Gratis
                                    </Text>
                                )}
                            </Pressable>

                            <Text style={styles.disclaimer}>
                                Sin compromisos · Sin pagos · Acceso inmediato
                            </Text>
                        </ScrollView>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
        maxHeight: "92%",
    },

    header: {
        paddingTop: 20,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: "center",
        position: "relative",
        backgroundColor: "#1e3a8a",
    },
    closeBtn: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    closeText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    crown: { fontSize: 44, marginBottom: 8 },
    headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginBottom: 4 },
    headerSub: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        textAlign: "center",
        fontWeight: "600",
        marginBottom: 14,
    },
    freeBadge: {
        backgroundColor: "#22c55e",
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    freeBadgeText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 13,
        letterSpacing: 0.5,
    },

    body: { padding: 20, paddingBottom: 36 },

    sectionLabel: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 1.2,
        marginBottom: 12,
    },

    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
    },
    featureIcon: { fontSize: 22, width: 32 },
    featureText: { flex: 1, color: colors.text, fontWeight: "600", fontSize: 14 },
    check: { color: "#22c55e", fontWeight: "900", fontSize: 16 },

    priceBox: {
        alignItems: "center",
        marginVertical: 24,
        padding: 20,
        backgroundColor: colors.primary + "12",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary + "30",
    },
    priceStrike: {
        color: colors.muted,
        fontSize: 16,
        fontWeight: "600",
        textDecorationLine: "line-through",
        marginBottom: 4,
    },
    priceFree: {
        color: colors.primary,
        fontSize: 48,
        fontWeight: "900",
        lineHeight: 56,
    },
    priceLabel: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: "600",
        marginTop: 4,
    },

    ctaBtn: {
        backgroundColor: "#22c55e",
        borderRadius: 14,
        paddingVertical: 18,
        alignItems: "center",
        marginBottom: 12,
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    ctaBtnText: { color: "#fff", fontWeight: "900", fontSize: 17 },

    disclaimer: {
        color: colors.muted,
        fontSize: 12,
        textAlign: "center",
        fontWeight: "600",
    },
});
