import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { fonts, radius, spacing } from "@/src/theme";
import { AppTitle } from "@/src/ui/AppTitle";
import { api } from "@/src/utils/api";
import { cartTotal, clearCart, getCart, setQty } from "@/src/utils/store-cart";

const notify = (t: string, m: string) => {
  if (Platform.OS === "web") window.alert(`${t}\n\n${m}`);
  else Alert.alert(t, m);
};

/** Cart + checkout (Cash on Delivery order). */
export default function StoreCart() {
  const router = useRouter();
  const [, force] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const lines = getCart();

  const placeOrder = async () => {
    if (lines.length === 0) return;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      notify("Checkout", "Please fill in your name, phone and delivery address.");
      return;
    }
    setPlacing(true);
    try {
      const res = await api.post<{ order_id: string; total: number }>(
        "/market/store/order",
        {
          items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty, size: l.size })),
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        },
      );
      clearCart();
      notify(
        "Order placed! 📦",
        `Order #${res.order_id.slice(0, 8)} — total $${res.total.toFixed(2)}.\nPayment: Cash on Delivery.`,
      );
      router.back();
    } catch (e) {
      notify("Checkout", e instanceof Error ? e.message : "Could not place the order.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="store-cart-screen">
      <View style={styles.topBar}>
        <Pressable testID="sc-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </Pressable>
        <AppTitle variant="navigation" testID="store-cart-header-title" style={styles.title}>Your cart</AppTitle>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        bottomOffset={spacing.xl}
        keyboardShouldPersistTaps="handled"
      >
        {lines.length === 0 ? (
          <Text style={styles.empty}>Your cart is empty.</Text>
        ) : (
          lines.map((l, i) => (
            <View key={`${l.product_id}-${i}`} style={styles.line} testID={`cart-line-${i}`}>
              <Image source={{ uri: l.image }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {l.name}
                </Text>
                {l.size ? <Text style={styles.lineSize}>Size: {l.size}</Text> : null}
                <Text style={styles.linePrice}>${(l.price * l.qty).toFixed(2)}</Text>
              </View>
              <View style={styles.qtyBox}>
                <Pressable
                  testID={`cart-minus-${i}`}
                  onPress={() => {
                    setQty(i, l.qty - 1);
                    force((v) => v + 1);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={16} color="#111" />
                </Pressable>
                <Text style={styles.qtyText}>{l.qty}</Text>
                <Pressable
                  testID={`cart-plus-${i}`}
                  onPress={() => {
                    setQty(i, l.qty + 1);
                    force((v) => v + 1);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={16} color="#111" />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {lines.length > 0 && (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${cartTotal().toFixed(2)}</Text>
            </View>

            <Text style={styles.section}>Delivery details</Text>
            <TextInput
              testID="sc-name"
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              testID="sc-phone"
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              testID="sc-address"
              style={[styles.input, { height: 84, textAlignVertical: "top" }]}
              placeholder="Delivery address"
              placeholderTextColor="#999"
              value={address}
              onChangeText={setAddress}
              multiline
            />
            <Text style={styles.codNote}>Payment method: Cash on Delivery</Text>
            <Pressable
              testID="sc-place-order"
              style={[styles.orderBtn, placing && { opacity: 0.6 }]}
              onPress={placeOrder}
              disabled={placing}
            >
              <Text style={styles.orderText}>
                Place order · ${cartTotal().toFixed(2)}
              </Text>
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  title: { flex: 1, textAlign: "center", fontFamily: fonts.displayBold, fontSize: 24, color: "#111" },
  empty: { fontFamily: fonts.text, fontSize: 15, color: "#666", textAlign: "center", marginTop: 60 },
  line: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 18 },
  thumb: { width: 70, height: 70, borderRadius: 6, backgroundColor: "#F5F5F5" },
  lineName: { fontFamily: fonts.textSemi, fontSize: 14, color: "#111", lineHeight: 19 },
  lineSize: { fontFamily: fonts.text, fontSize: 12.5, color: "#777", marginTop: 2 },
  linePrice: { fontFamily: fonts.textBold, fontSize: 14.5, color: "#111", marginTop: 3 },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 36,
  },
  qtyText: { fontFamily: fonts.textBold, fontSize: 14, color: "#111" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 14,
    marginTop: 6,
  },
  totalLabel: { fontFamily: fonts.textSemi, fontSize: 16, color: "#111" },
  totalValue: { fontFamily: fonts.displayBold, fontSize: 18, color: "#111" },
  section: { fontFamily: fonts.displayBold, fontSize: 16.5, color: "#111", marginTop: 22, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.text,
    fontSize: 14.5,
    color: "#111",
    marginBottom: 10,
  },
  codNote: { fontFamily: fonts.text, fontSize: 13, color: "#666", marginTop: 4 },
  orderBtn: {
    backgroundColor: "#5A31F4",
    borderRadius: 10,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  orderText: { fontFamily: fonts.textBold, fontSize: 16, color: "#FFF" },
});
