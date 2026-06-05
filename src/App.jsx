import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const FILTERS = ["Alle", "Offen", "Erledigt"];

const PRIORITY = {
  niedrig: { label: "Niedrig", color: "#34c759" },
  mittel:  { label: "Mittel",  color: "#ff9500" },
  hoch:    { label: "Hoch",    color: "#ff3b30" },
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return { label: "Heute", overdue: false };
  if (diff === 1) return { label: "Morgen", overdue: false };
  if (diff === -1) return { label: "Gestern", overdue: true };
  if (diff < 0) return { label: `${Math.abs(diff)} Tage überfällig`, overdue: true };
  return {
    label: d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    overdue: false,
  };
}

function useTodos() {
  const [todos, setTodos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { setError(error.message); }
    else { setTodos(data); }
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const add = async (text, priority, due_date) => {
    const { data, error } = await supabase
      .from("todos")
      .insert({ text, done: false, priority: priority || null, due_date: due_date || null })
      .select()
      .single();

    if (!error) setTodos(prev => [data, ...prev]);
  };

  const toggle = async (id, done) => {
    const { error } = await supabase
      .from("todos")
      .update({ done: !done })
      .eq("id", id);

    if (!error) setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, done: !done } : t)
    );
  };

  const remove = async (id) => {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id);

    if (!error) setTodos(prev => prev.filter(t => t.id !== id));
  };

  const clearDone = async () => {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("done", true);

    if (!error) setTodos(prev => prev.filter(t => !t.done));
  };

  const update = async (id, fields) => {
    const { error } = await supabase
      .from("todos")
      .update(fields)
      .eq("id", id);

    if (!error) setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, ...fields } : t)
    );
  };

  return { todos, loaded, error, add, toggle, remove, clearDone, update };
}

export default function App() {
  const { todos, loaded, error, add, toggle, remove, clearDone, update } = useTodos();

  // Add form
  const [input, setInput] = useState("");
  const [newPriority, setNewPriority] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [showExtras, setShowExtras] = useState(false);

  // List state
  const [filter, setFilter] = useState("Alle");
  const [removing, setRemoving] = useState(null);
  const [toggling, setToggling] = useState(null);

  // Inline editing
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState(null);
  const [editDate, setEditDate] = useState("");

  const inputRef = useRef(null);
  const editRef = useRef(null);

  const handleInputChange = (val) => {
    setInput(val);
    if (val.trim() && !showExtras) setShowExtras(true);
    if (!val.trim()) { setShowExtras(false); setNewPriority(null); setNewDate(""); }
  };

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    add(text, newPriority, newDate || null);
    setInput("");
    setNewPriority(null);
    setNewDate("");
    setShowExtras(false);
  };

  const handleToggle = async (id, done) => {
    setToggling(id);
    await toggle(id, done);
    setToggling(null);
  };

  const handleRemove = async (id) => {
    setRemoving(id);
    await new Promise(r => setTimeout(r, 280));
    await remove(id);
    setRemoving(null);
  };

  const startEdit = (todo) => {
    setEditing(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority || null);
    setEditDate(todo.due_date || "");
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const commitEdit = async () => {
    const text = editText.trim();
    const todo = todos.find(t => t.id === editing);
    if (!todo) { setEditing(null); return; }
    const fields = {};
    if (text && text !== todo.text) fields.text = text;
    if (editPriority !== todo.priority) fields.priority = editPriority;
    if ((editDate || null) !== (todo.due_date || null)) fields.due_date = editDate || null;
    if (Object.keys(fields).length > 0) await update(editing, fields);
    setEditing(null);
  };

  const filtered = todos.filter(t => {
    if (filter === "Offen") return !t.done;
    if (filter === "Erledigt") return t.done;
    return true;
  });

  const openCount = todos.filter(t => !t.done).length;

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
        <div style={s.badge}>{loaded ? openCount : "–"}</div>
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBanner}>
          Verbindungsfehler: {error}
        </div>
      )}

      {/* Segmented control */}
      <div style={s.segmentedWrapper}>
        <div style={s.segmented}>
          {FILTERS.map(f => (
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
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <button
              style={{
                ...s.addBtn,
                opacity: input.trim() ? 1 : 0.35,
                transform: input.trim() ? "scale(1)" : "scale(0.92)",
              }}
              onClick={handleAdd}
              disabled={!input.trim()}
            >
              <span style={s.addBtnInner}>+</span>
            </button>
          </div>

          {showExtras && (
            <div style={s.extrasRow}>
              <div style={s.extrasLeft}>
                {Object.entries(PRIORITY).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    style={{
                      ...s.priorityPill,
                      background: newPriority === key ? color : "transparent",
                      color: newPriority === key ? "#fff" : color,
                      border: `1.5px solid ${color}`,
                    }}
                    onClick={() => setNewPriority(newPriority === key ? null : key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                style={s.dateInput}
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
          )}
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
          {!loaded ? (
            <div style={s.emptyState}>
              <div style={s.emptyText}>Lädt…</div>
            </div>
          ) : filtered.length === 0 ? (
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
            filtered.map((todo, i) => {
              const dateInfo = formatDate(todo.due_date);
              const prio = todo.priority ? PRIORITY[todo.priority] : null;
              const isEditing = editing === todo.id;

              return (
                <div key={todo.id}>
                  <div
                    style={{
                      ...s.row,
                      opacity: removing === todo.id ? 0 : 1,
                      transform: removing === todo.id ? "translateX(-20px)" : "translateX(0)",
                      transition: "opacity 0.28s ease, transform 0.28s ease",
                      alignItems: isEditing ? "flex-start" : "center",
                    }}
                  >
                    <button
                      style={{
                        ...s.circle,
                        borderColor: todo.done ? "#007AFF" : (prio ? prio.color : "#c7c7cc"),
                        background: todo.done ? "#007AFF" : "transparent",
                        transform: toggling === todo.id ? "scale(0.82)" : "scale(1)",
                        transition: "all 0.15s ease",
                        marginTop: isEditing ? 2 : 0,
                      }}
                      onClick={() => handleToggle(todo.id, todo.done)}
                    >
                      {todo.done && (
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* Text + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <>
                          <input
                            ref={editRef}
                            style={{ ...s.taskText, ...s.editInput,
                              color: todo.done ? "#8e8e93" : "#000",
                              textDecoration: todo.done ? "line-through" : "none",
                            }}
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                          {/* Edit extras */}
                          <div style={{ ...s.extrasRow, padding: "6px 0 4px", borderTop: "none" }}>
                            <div style={s.extrasLeft}>
                              {Object.entries(PRIORITY).map(([key, { label, color }]) => (
                                <button
                                  key={key}
                                  style={{
                                    ...s.priorityPill,
                                    fontSize: 11,
                                    padding: "2px 7px",
                                    background: editPriority === key ? color : "transparent",
                                    color: editPriority === key ? "#fff" : color,
                                    border: `1.5px solid ${color}`,
                                  }}
                                  onClick={() => setEditPriority(editPriority === key ? null : key)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <input
                              type="date"
                              style={{ ...s.dateInput, fontSize: 11 }}
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                            />
                          </div>
                          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
                            <button style={s.editSaveBtn} onClick={commitEdit}>Speichern</button>
                            <button style={s.editCancelBtn} onClick={() => setEditing(null)}>Abbrechen</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              ...s.taskText,
                              color: todo.done ? "#8e8e93" : "#000",
                              textDecoration: todo.done ? "line-through" : "none",
                              display: "block",
                            }}
                            onDoubleClick={() => !todo.done && startEdit(todo)}
                          >
                            {todo.text}
                          </span>
                          {/* Meta row */}
                          {(prio || dateInfo) && !todo.done && (
                            <div style={s.metaRow}>
                              {prio && (
                                <span style={{ ...s.metaChip, color: prio.color, border: `1px solid ${prio.color}` }}>
                                  {prio.label}
                                </span>
                              )}
                              {dateInfo && (
                                <span style={{
                                  ...s.metaChip,
                                  color: dateInfo.overdue ? "#ff3b30" : "#8e8e93",
                                  border: `1px solid ${dateInfo.overdue ? "#ff3b30" : "#c7c7cc"}`,
                                }}>
                                  📅 {dateInfo.label}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <button style={s.deleteCircle} onClick={() => handleRemove(todo.id)}>
                        <span style={s.deleteX}>×</span>
                      </button>
                    )}
                  </div>
                  {i < filtered.length - 1 && <div style={s.divider} />}
                </div>
              );
            })
          )}
        </div>

        {todos.some(t => t.done) && (
          <button style={s.clearBtn} onClick={clearDone}>
            Erledigte löschen
          </button>
        )}
      </div>

      {todos.length > 0 && loaded && (
        <div style={s.footer}>
          {todos.filter(t => t.done).length} von {todos.length} erledigt
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
  errorBanner: {
    margin: "0 16px 12px",
    background: "#fff2f2",
    border: "1px solid #ffcccc",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#cc0000",
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
  extrasRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 16px 12px",
    borderTop: "1px solid #f0f0f0",
    paddingTop: 10,
    flexWrap: "wrap",
  },
  extrasLeft: {
    display: "flex",
    gap: 6,
    flex: 1,
  },
  priorityPill: {
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  dateInput: {
    border: "1.5px solid #c7c7cc",
    borderRadius: 8,
    padding: "3px 8px",
    fontSize: 12,
    fontFamily: "inherit",
    color: "#333",
    background: "transparent",
    outline: "none",
  },
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
    fontSize: 17,
    letterSpacing: -0.2,
    lineHeight: 1.3,
    transition: "color 0.2s",
    wordBreak: "break-word",
  },
  metaRow: {
    display: "flex",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaChip: {
    fontSize: 11,
    borderRadius: 6,
    padding: "1px 7px",
    fontWeight: 500,
  },
  editInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "inherit",
    padding: 0,
    margin: 0,
    width: "100%",
    caretColor: "#007AFF",
    display: "block",
  },
  editSaveBtn: {
    background: "#007AFF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "5px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  editCancelBtn: {
    background: "transparent",
    color: "#8e8e93",
    border: "none",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
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
