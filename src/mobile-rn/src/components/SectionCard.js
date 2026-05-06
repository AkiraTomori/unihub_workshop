import React from "react";
import { StyleSheet, View } from "react-native";

export default function SectionCard({ children }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dbeafe",
    marginBottom: 12
  }
});
