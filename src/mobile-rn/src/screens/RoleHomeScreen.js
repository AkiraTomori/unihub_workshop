import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import StudentScreen from "./StudentScreen";
import AdminScreen from "./AdminScreen";
import CheckerScreen from "./CheckerScreen";

const Tab = createBottomTabNavigator();

function HeaderBar() {
  const { user, logout } = useAuth();
  return (
    <SafeAreaView edges={["top"]} style={styles.headerSafe}>
      <View style={styles.header}>
        <View>
          <View style={styles.titleRow}>
            <Ionicons name="school-outline" size={18} color="#fff" />
            <Text style={styles.headerTitle}>UniHub Mobile</Text>
          </View>
          <View style={styles.subRow}>
            <Ionicons name="person-circle-outline" size={13} color="#c7d2fe" />
            <Text style={styles.headerSub}>
              {user?.fullName || "User"} ({user?.role || "UNKNOWN"})
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} hitSlop={10}>
          <View style={styles.logoutRow}>
            <Ionicons name="log-out-outline" size={14} color="#1e3a8a" />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <HeaderBar />,
        tabBarActiveTintColor: "#1e3a8a",
        tabBarInactiveTintColor: "#64748b"
      }}
    >
      <Tab.Screen
        name="Workshops"
        component={StudentScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <HeaderBar />,
        tabBarActiveTintColor: "#1e3a8a",
        tabBarInactiveTintColor: "#64748b"
      }}
    >
      <Tab.Screen
        name="Admin Panel"
        component={AdminScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="analytics-outline" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

function CheckerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        header: () => <HeaderBar />,
        tabBarActiveTintColor: "#1e3a8a",
        tabBarInactiveTintColor: "#64748b"
      }}
    >
      <Tab.Screen
        name="Check-in"
        component={CheckerScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function RoleHomeScreen() {
  const { user } = useAuth();

  if (user?.role === "STUDENT") return <StudentTabs />;
  if (user?.role === "ADMIN") return <AdminTabs />;
  if (user?.role === "CHECKER") return <CheckerTabs />;

  return (
    <SafeAreaView style={styles.centered}>
      <Text>Unsupported role</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerSafe: {
    backgroundColor: "#1e3a8a"
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 17 },
  headerSub: { color: "#c7d2fe", fontSize: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  logoutBtn: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  logoutRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  logoutText: { color: "#1e3a8a", fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" }
});
