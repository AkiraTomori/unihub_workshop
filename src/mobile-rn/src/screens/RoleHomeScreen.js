import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
          <Text style={styles.headerTitle}>UniHub Mobile</Text>
          <Text style={styles.headerSub}>
            {user?.fullName || "User"} ({user?.role || "UNKNOWN"})
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} hitSlop={10}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={{ header: () => <HeaderBar /> }}>
      <Tab.Screen name="Workshops" component={StudentScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ header: () => <HeaderBar /> }}>
      <Tab.Screen name="Admin Panel" component={AdminScreen} />
    </Tab.Navigator>
  );
}

function CheckerTabs() {
  return (
    <Tab.Navigator screenOptions={{ header: () => <HeaderBar /> }}>
      <Tab.Screen name="Check-in" component={CheckerScreen} />
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
  logoutBtn: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  logoutText: { color: "#1e3a8a", fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" }
});
