import React, { useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useOutboxStore } from "../queue/outboxStore";

export const OutboxScreen: React.FC = () => {
  const hydrated = useOutboxStore((s) => s.hydrated);
  const entries = useOutboxStore((s) => s.entries);
  const draining = useOutboxStore((s) => s.draining);
  const hydrate = useOutboxStore((s) => s.hydrate);
  const retryAll = useOutboxStore((s) => s.retryAll);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outbox</Text>
        <Text style={styles.meta}>{draining ? "Draining…" : `${entries.length} queued`}</Text>
        <TouchableOpacity style={styles.btn} onPress={retryAll} disabled={draining || !entries.length}>
          <Text style={styles.btnText}>Retry All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <OutboxRow id={item.id} />}
        ListEmptyComponent={<Text style={styles.empty}>No queued entries.</Text>}
      />
    </View>
  );
};

const OutboxRow: React.FC<{ id: string }> = ({ id }) => {
  const entry = useOutboxStore((s) => s.entries.find((x) => x.id === id));
  const cancel = useOutboxStore((s) => s.cancel);
  const retryNow = useOutboxStore((s) => s.retryNow);

  if (!entry) return null;
  const when = new Date(entry.createdAt).toLocaleTimeString();

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.path}>{entry.path}</Text>
        <Text style={styles.small}>
          {entry.status.toUpperCase()} • tries {entry.retryCount} • {when}
        </Text>
        {entry.lastErrorMsg ? <Text style={styles.err}>{entry.lastErrorMsg}</Text> : null}
      </View>
      <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={() => retryNow(id)}>
        <Text style={styles.btnText}>Retry</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.danger]} onPress={() => cancel(id)}>
        <Text style={styles.btnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", flex: 1 },
  meta: { fontSize: 12, color: "#666" },
  btn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#2e7d32", borderRadius: 6 },
  btnText: { color: "#fff", fontWeight: "600" },
  sep: { height: 1, backgroundColor: "#eee", marginVertical: 8 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  path: { fontWeight: "700", marginBottom: 2 },
  small: { fontSize: 12, color: "#666" },
  err: { marginTop: 4, color: "#b00020" },
  secondary: { backgroundColor: "#1976d2" },
  danger: { backgroundColor: "#d32f2f" },
});
