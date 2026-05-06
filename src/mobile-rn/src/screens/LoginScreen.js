import React, { useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("student@unihub.local");
  const [password, setPassword] = useState("UniHub@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      await login(email.trim(), password);
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>UniHub Mobile</Text>
        <Text style={styles.subtitle}>Sign in with your UniHub account</Text>
        <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" />
        <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" />
        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", backgroundColor: "#eef4ff", padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#dbeafe" },
  title: { fontSize: 24, fontWeight: "700", color: "#1e3a8a" },
  subtitle: { marginTop: 4, color: "#334155", marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  button: { backgroundColor: "#1e3a8a", borderRadius: 10, alignItems: "center", paddingVertical: 12 },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { marginTop: 10, color: "#dc2626" }
});
