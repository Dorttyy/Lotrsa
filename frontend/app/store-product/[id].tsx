import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { useAuth } from "@/src/context/AuthContext";
import { fonts, radius, spacing } from "@/src/theme";
import { api } from "@/src/utils/api";
import { addToCart, cartCount } from "@/src/utils/store-cart";
import type { Product } from "../store";

const notify = (t: string, m: string) => {
  if (Platform.OS === "web") window.alert(`${t}\n\n${m}`);
  else Alert.alert(t, m);
};

/** Product detail — carousel dots, size chips, qty stepper, cart/buy. */
export default function StoreProduct() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQtyN] = useState(1);
  const [dot, setDot] = useState(0);
  const [, force] = useState(0);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ products: Product[] }>("/market/store")
      .then((d) => {
        const p = d.products.find((x) => x.id === id) || null;
        setProduct(p);
        if (p?.sizes?.length) setSize(p.sizes[0]);
      })
      .catch(() => {});
  }, [user, id]);

  if (!product) {
    return <SafeAreaView style={styles.screen} />;
  }

  const add = () => {
    addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty,
      size,
    });
    force((v) => v + 1);
    notify("Added to cart 🛒", `${product.name}${size ? ` (${size})` : ""} × ${qty}`);
  };

  const buyNow = () => {
    add();
    router.push("/store-cart");
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="store-product-screen">
      <View style={styles.topBar}>
        <Pressable testID="sp-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable testID="sp-cart" onPress={() => router.push("/store-cart")} hitSlop={8}>
          <Ionicons name="bag-outline" size={23} color="#111" />
          {cartCount() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount()}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setDot(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))
          }
        >
          {[product.image, product.image].map((img, i) => (
            <Image key={i} source={{ uri: img }} style={styles.hero} contentFit="cover" />
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.dot, i === dot && styles.dotOn]} />
          ))}
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>
          <Text style={styles.desc}>{product.desc}</Text>

          {product.sizes.length > 0 && (
            <>
              <Text style={styles.sizeLabel}>Size</Text>
              <View style={styles.sizeRow}>
                {product.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <Pressable
                      key={s}
                      testID={`sp-size-${s}`}
                      style={[styles.sizeChip, on && styles.sizeChipOn]}
                      onPress={() => setSize(s)}
                    >
                      <Text style={[styles.sizeText, on && styles.sizeTextOn]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.buyRow}>
            <View style={styles.qtyBox}>
              <Pressable testID="sp-qty-minus" onPress={() => setQtyN((q) => Math.max(1, q - 1))} hitSlop={8}>
                <Ionicons name="remove" size={19} color="#111" />
              </Pressable>
              <Text style={styles.qtyText}>{qty}</Text>
              <Pressable testID="sp-qty-plus" onPress={() => setQtyN((q) => Math.min(20, q + 1))} hitSlop={8}>
                <Ionicons name="add" size={19} color="#111" />
              </Pressable>
            </View>
            <Pressable testID="sp-add-cart" style={styles.addBtn} onPress={add}>
              <Ionicons name="bag-add-outline" size={18} color="#FFF" />
              <Text style={styles.addText}>Add to cart</Text>
            </Pressable>
          </View>
          <Pressable testID="sp-buy-now" style={styles.buyBtn} onPress={buyNow}>
            <Text style={styles.buyText}>
              Buy with <Text style={{ fontFamily: fonts.displayBold }}>shop</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#5A31F4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: { fontFamily: fonts.textBold, fontSize: 9.5, color: "#FFF" },
  hero: { width: "100%", height: 300, backgroundColor: "#F5F5F5" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D9D9D9" },
  dotOn: { backgroundColor: "#111" },
  name: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 34, color: "#111" },
  price: { fontFamily: fonts.text, fontSize: 17, color: "#444", marginTop: 10 },
  desc: { fontFamily: fonts.text, fontSize: 14.5, lineHeight: 21, color: "#555", marginTop: 10 },
  sizeLabel: { fontFamily: fonts.text, fontSize: 14, color: "#666", marginTop: 20, marginBottom: 8 },
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sizeChip: {
    minWidth: 62,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  sizeChipOn: { backgroundColor: "#111", borderColor: "#111" },
  sizeText: { fontFamily: fonts.textSemi, fontSize: 15, color: "#111" },
  sizeTextOn: { color: "#FFF" },
  buyRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22 },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 52,
  },
  qtyText: { fontFamily: fonts.textBold, fontSize: 16, color: "#111" },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111",
    borderRadius: 28,
    height: 52,
  },
  addText: { fontFamily: fonts.textBold, fontSize: 15.5, color: "#FFF" },
  buyBtn: {
    backgroundColor: "#5A31F4",
    borderRadius: 10,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buyText: { fontFamily: fonts.textSemi, fontSize: 16, color: "#FFF" },
});
