import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("New Student");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("huy.thai@student.edu.vn");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    if (!trimmedEmail) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return "Invalid email format";
    if (!password || password.length < 6) return "Password must be at least 6 characters";
    if (mode === "register") {
      if (!trimmedName || trimmedName.length < 2) return "Full name must be at least 2 characters";
      if (studentCode.trim() && !/^[a-zA-Z0-9_-]{2,50}$/.test(studentCode.trim())) {
        return "Student code format is invalid";
      }
    }
    return "";
  };

  const onSubmit = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    try {
      setLoading(true);
      setError("");
      if (mode === "register") {
        await register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          studentCode: studentCode.trim()
        });
        setMode("login");
        setPassword("");
        setError("");
        Alert.alert("Registration successful", "Your account was created. Please sign in to continue.");
      } else {
        await login(email.trim(), password);
      }
    } catch (e) {
      setError(e.message || (mode === "register" ? "Registration failed" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>UniHub Mobile</Text>
        <Text style={styles.subtitle}>
          {mode === "register" ? "Create a new UniHub student account" : "Sign in with your UniHub account"}
        </Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeButton, mode === "login" && styles.modeButtonActive]}
            onPress={() => {
              setMode("login");
              setError("");
            }}
            disabled={loading}
          >
            <View style={styles.modeRowInline}>
              <Ionicons name="log-in-outline" size={14} color={mode === "login" ? "#fff" : "#1e3a8a"} />
              <Text style={[styles.modeButtonText, mode === "login" && styles.modeButtonTextActive]}>Login</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === "register" && styles.modeButtonActive]}
            onPress={() => {
              setMode("register");
              setError("");
            }}
            disabled={loading}
          >
            <View style={styles.modeRowInline}>
              <Ionicons name="person-add-outline" size={14} color={mode === "register" ? "#fff" : "#1e3a8a"} />
              <Text style={[styles.modeButtonText, mode === "register" && styles.modeButtonTextActive]}>Register</Text>
            </View>
          </TouchableOpacity>
        </View>
        {mode === "register" ? (
          <>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={16} color="#64748b" />
              <TextInput style={styles.inputInline} value={fullName} onChangeText={setFullName} placeholder="Full name" />
            </View>
            <TextInput
              style={styles.input}
              value={studentCode}
              onChangeText={setStudentCode}
              placeholder="Student code (optional)"
            />
          </>
        ) : null}
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={16} color="#64748b" />
          <TextInput style={styles.inputInline} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" />
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={16} color="#64748b" />
          <TextInput style={styles.inputInline} secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" />
        </View>
        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.modeRowInline}>
              <Ionicons name={mode === "register" ? "person-add-outline" : "log-in-outline"} size={15} color="#fff" />
              <Text style={styles.buttonText}>{mode === "register" ? "Create account" : "Sign in"}</Text>
            </View>
          )}
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
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#fff"
  },
  modeButtonActive: { backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" },
  modeRowInline: { flexDirection: "row", alignItems: "center", gap: 5 },
  modeButtonText: { color: "#1e3a8a", fontWeight: "700" },
  modeButtonTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 1,
    marginBottom: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  inputInline: {
    flex: 1,
    paddingVertical: 10
  },
  button: { backgroundColor: "#1e3a8a", borderRadius: 10, alignItems: "center", paddingVertical: 12 },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { marginTop: 10, color: "#dc2626" }
});
