import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "ios-todo-v1";
const FILTERS = ["Alle", "Offen", "Erledigt"];

function useTodos() {
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const save = (next) => {
    setTodos(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  return { todos, save };
}

export default function App() {
  const { todos, save } = useTodos();
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [removing, setRemoving] = useState(null);
  const [toggling, setToggling] = useState(null);
  const inputRef = useRef(null);

  const add = () => {
    const text = input.trim();
    if (!text) return;
    save([{ id: Date.now(), text, done: false }, ...todos]);
    setInput("");
  };

  const toggle = async (id) => {
    setToggling(id);
    await new Promise((r) => setTimeout(r, 120));
    save(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    setToggling(null);
  };

  const remove = async (id) => {
    setRemoving(id);
    await new Promise((r) => setTimeout(r, 280));
    save(todos.filter((t) => t.id !== id));
    setRemoving(null);
  };

  const filtered = todos.filter((t) => {
    if (filter === "Offen") return !t.done;
    if (filter === "Erledigt") return t.done;
    return true;
  });

  const openCount = todos.filter((t) => !t.done).length;

  return (
    <div style={s.root}>
      {/* Status bar */}
      <div style={s.statusBar}>
        <span style={s.statusTime}>
          {new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div style={s.statusIcons}>
          <span>●●●</span>
          <span style={{ fontSize: 10 }}>WiFi</span>
          <span>⬛</span>
        </div>
      </div>

      {/* Large title */}
      <div style={s.navBar}>
        <h1 style={s.largeTitle}>Aufgaben</h1>
        <div style={s.badge}>{openCount}</div>
      </div>

      {/* Segmented control */}
      <div style={s.segmentedWrapper}>
        <div style={s.segmented}>
          {FILTERS.map((f) => (
            <button
              key={f}
              style={{
                ...s.segment,
                background: filter === f ? "#fff" : "transparent",
                color: filter === f ? "#000" : "#666",
                boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                fontWeight: filter === f ? 600 : 400,
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={s.section}>
        <div style={s.sectionLabel}>NEUE AUFGABE</div>
        <div style={s.card}>
          <div style={s.inputRow}>
            <input
              ref={inputRef}
              style={s.input}
              placeholder="Aufgabe eingeben…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button
              style={{
                ...s.addBtn,
                opacity: input.trim() ? 1 : 0.35,
                transform: input.trim() ? "scale(1)" : "scale(0.92)",
              }}
              onClick={add}
              disabled={!input.trim()}
            >
              <span style={s.addBtnInner}>+</span>
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={s.section}>
        {filtered.length > 0 && (
          <div style={s.sectionLabel}>
            {filter === "Alle" ? "AUFGABEN" : filter === "Offen" ? "OFFEN" : "ERLEDIGT"}
          </div>
        )}
        <div style={s.card}>
          {filtered.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>{filter === "Erledigt" ? "✓" : "☀️"}</div>
              <div style={s.emptyText}>
                {filter === "Erledigt" ? "Noch nichts erledigt" : "Keine Aufgaben"}
              </div>
              <div style={s.emptySubtext}>
                {filter !== "Erledigt" && "Füge oben eine neue Aufgabe hinzu"}
              </div>
            </div>
          ) : (
            filtered.map((todo, i) => (
              <div key={todo.id}>
                <div
                  style={{
                    ...s.row,
                    opacity: removing === todo.id ? 0 : 1,
                    transform:
                      removing === todo.id ? "translateX(-20px)" : "translateX(0)",
                    transition: "opacity 0.28s ease, transform 0.28s ease",
                  }}
                >
                  <button
                    style={{
                      ...s.circle,
                      borderColor: todo.done ? "#007AFF" : "#c7c7cc",
                      background: todo.done ? "#007AFF" : "transparent",
                      transform: toggling === todo.id ? "scale(0.82)" : "scale(1)",
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => toggle(todo.id)}
                  >
                    {todo.done && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path
                          d="M1 4L4 7.5L10 1"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  <span
                    style={{
                      ...s.taskText,
                      color: todo.done ? "#8e8e93" : "#000",
                      textDecoration: todo.done ? "line-through" : "none",
                    }}
                  >
                    {todo.text}
                  </span>

                  <button style={s.deleteCircle} onClick={() => remove(todo.id)}>
                    <span style={s.deleteX}>×</span>
                  </button>
                </div>
                {i < filtered.length - 1 && <div style={s.divider} />}
              </div>
            ))
          )}
        </div>

        {todos.some((t) => t.done) && (
          <button style={s.clearBtn} onClick={() => save(todos.filter((t) => !t.done))}>
            Erledigte löschen
          </button>
        )}
      </div>

      {todos.length > 0 && (
        <div style={s.footer}>
          {todos.filter((t) => t.done).length} von {todos.length} erledigt
        </div>
      )}
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    background: "#f2f2f7",
    fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif",
    maxWidth: 390,
    margin: "0 auto",
    paddingBottom: 40,
  },
  statusBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px 4px",
    fontSize: 12,
    color: "#000",
    fontWeight: 600,
  },
  statusTime: { fontSize: 15, fontWeight: 700 },
  statusIcons: {
    display: "flex",
    gap: 5,
    fontSize: 10,
    alignItems: "center",
    opacity: 0.6,
  },
  navBar: {
    padding: "8px 20px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  largeTitle: {
    margin: 0,
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: 0.35,
    color: "#000",
    lineHeight: 1,
  },
  badge: {
    background: "#007AFF",
    color: "#fff",
    borderRadius: 12,
    minWidth: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    padding: "0 7px",
    marginBottom: 2,
  },
  segmentedWrapper: { padding: "0 16px 16px" },
  segmented: {
    background: "#e5e5ea",
    borderRadius: 9,
    padding: 2,
    display: "flex",
  },
  segment: {
    flex: 1,
    border: "none",
    borderRadius: 7,
    padding: "6px 0",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    letterSpacing: "-0.1px",
  },
  section: { padding: "0 16px 8px" },
  sectionLabel: {
    fontSize: 12,
    color: "#6d6d72",
    fontWeight: 400,
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: { background: "#fff", borderRadius: 12, overflow: "hidden" },
  inputRow: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    gap: 10,
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 17,
    color: "#000",
    fontFamily: "inherit",
    background: "transparent",
    caretColor: "#007AFF",
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    background: "#007AFF",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s, transform 0.2s",
    flexShrink: 0,
    padding: 0,
  },
  addBtnInner: { color: "#fff", fontSize: 22, lineHeight: 1, marginTop: -2 },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    gap: 12,
    minHeight: 50,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    border: "2px solid",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
  },
  taskText: {
    flex: 1,
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 1.3,
    transition: "color 0.2s",
    wordBreak: "break-word",
  },
  deleteCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    background: "#c7c7cc",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
    opacity: 0.7,
  },
  deleteX: { color: "#fff", fontSize: 16, lineHeight: 1, marginTop: -1 },
  divider: { height: 1, background: "#e5e5ea", marginLeft: 54 },
  emptyState: { padding: "40px 20px", textAlign: "center" },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 17, color: "#3c3c43", fontWeight: 500, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: "#8e8e93" },
  clearBtn: {
    width: "100%",
    marginTop: 8,
    background: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 16px",
    color: "#ff3b30",
    fontSize: 17,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "center",
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    color: "#8e8e93",
    padding: "8px 0 0",
  },
};
