import { Ionicons } from "@/src/ui/icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "@/src/components/layout/SafeAreaView";

import { IconChip } from "@/src/components/IconChip";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api } from "@/src/utils/api";
import { cartCount } from "@/src/utils/store-cart";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  sizes: string[];
  image: string;
  desc: string;
}

const CATS = ["Home", "Product Catalog", "Apparel", "Bags", "phone case", "Contact Us"];

/** Merch store home — Shopify-style: drawer, search, category nav, grid. */
export default function Store() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, force] = useState(0);

  useFocusEffect(
    useCallback(() => {
      force((v) => v + 1); // refresh cart badge
      if (!user) return;
      api
        .get<{ products: Product[] }>("/market/store")
        .then((d) => setProducts(d.products))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user]),
  );

  const visible = useMemo(() => {
    let list = products;
    if (cat !== "Home" && cat !== "Product Catalog" && cat !== "Contact Us") {
      list = list.filter((p) => p.category === cat);
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return list;
  }, [products, cat, query]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]} testID="store-screen">
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable testID="store-menu-btn" onPress={() => setMenuOpen(true)} hitSlop={8}>
          <Ionicons name="menu" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <IconChip
          testID="store-search-btn"
          tint="brand"
          icon="search"
          size={18}
          onPress={() => setSearchOpen((v) => !v)}
        />
        <View style={{ width: 8 }} />
        <IconChip
          testID="store-cart-btn"
          tint="brand"
          icon="bag-handle"
          size={17}
          onPress={() => router.push("/store-cart")}
          badge={
            cartCount() > 0 ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount()}</Text>
              </View>
            ) : undefined
          }
        />
        <View style={{ width: 8 }} />
        <IconChip
          testID="store-close-btn"
          tint="brand"
          icon="close"
          size={20}
          onPress={() => router.back()}
        />
      </View>

      {searchOpen && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.onSurfaceSecondary} />
          <TextInput
            testID="store-search-input"
            style={styles.searchInput}
            placeholder="Search products…"
            placeholderTextColor={colors.onSurfaceSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      )}

      {/* Category nav */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATS.map((c) => (
            <Pressable key={c} testID={`store-cat-${c}`} onPress={() => setCat(c)} hitSlop={6}>
              <Text style={[styles.catText, cat === c && styles.catTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.onSurface} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 14, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ gap: 22, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text style={styles.pageTitle}>
              {cat === "Contact Us" ? "Contact Us" : cat}
            </Text>
          }
          ListEmptyComponent={
            cat === "Contact Us" ? (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <Text style={styles.contactText}>
                  📧 store@linguaconnect.app{"\n"}💬 Or message us in-app — we
                  reply within 24h.
                </Text>
              </View>
            ) : (
              <Text style={styles.contactText}>No products found.</Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`store-product-${item.id}`}
              style={styles.card}
              onPress={() => router.push(`/store-product/${item.id}`)}
            >
              <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" transition={120} />
              <Text style={styles.cardName} numberOfLines={3}>
                {item.name}
              </Text>
              <Text style={styles.cardPrice}>${item.price.toFixed(2)}</Text>
            </Pressable>
          )}
        />
      )}

      {/* Drawer */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.drawerRoot}>
          <View style={styles.drawer}>
            <Pressable testID="drawer-close" onPress={() => setMenuOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.onSurface} />
            </Pressable>
            {CATS.map((c) => (
              <Pressable
                key={c}
                testID={`drawer-${c}`}
                onPress={() => {
                  setCat(c);
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.drawerItem}>{c}</Text>
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            <Text style={styles.drawerMeta}>USD / EN ›</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {products.slice(0, 4).map((p) => (
                <Pressable
                  key={p.id}
                  style={{ width: 110 }}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(`/store-product/${p.id}`);
                  }}
                >
                  <Image source={{ uri: p.image }} style={styles.drawerThumb} contentFit="cover" />
                  <Text style={styles.drawerThumbName} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={styles.cardPrice}>${p.price.toFixed(2)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  cartBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: { fontFamily: fonts.textBold, fontSize: 9.5, color: colors.onBrand },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 6,
  },
  searchInput: { flex: 1, fontFamily: fonts.text, fontSize: 14.5, color: colors.onSurface },
  catRow: { gap: 22, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  catText: { fontFamily: fonts.textSemi, fontSize: 15.5, color: colors.onSurfaceSecondary },
  catTextOn: { fontFamily: fonts.textBold, color: colors.onSurface, textDecorationLine: "underline" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
  },
  card: { flex: 1 / 2 },
  cardImage: { width: "100%", aspectRatio: 1, borderRadius: 4, backgroundColor: colors.surfaceSecondary },
  cardName: { fontFamily: fonts.text, fontSize: 15, lineHeight: 22, color: colors.onSurface, marginTop: 10 },
  cardPrice: { fontFamily: fonts.textSemi, fontSize: 14.5, color: colors.onSurface, marginTop: 4 },
  contactText: {
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 24,
    color: colors.onSurfaceSecondary,
    paddingHorizontal: spacing.lg,
  },
  drawerRoot: { flex: 1, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.5)" },
  drawer: {
    width: "82%",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingTop: 54,
    gap: 6,
  },
  drawerItem: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.onSurface, paddingVertical: 12 },
  drawerMeta: { fontFamily: fonts.textSemi, fontSize: 14, color: colors.onSurfaceSecondary, marginBottom: 12 },
  drawerThumb: { width: 110, height: 110, borderRadius: 4, backgroundColor: colors.surfaceSecondary },
  drawerThumbName: { fontFamily: fonts.text, fontSize: 12.5, color: colors.onSurface, marginTop: 6 },
});
