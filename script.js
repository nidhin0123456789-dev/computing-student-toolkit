"use strict";
const $ = (s) => document.querySelector(s);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function el(tag, props = {}, ...kids) {
  const n = Object.assign(document.createElement(tag), props);
  kids.forEach((k) => n.append(k));
  return n;
}

/* ---------- Theme & nav ---------- */
const root = document.documentElement;
const themeBtn = $("#theme");
function setTheme(t) {
  root.dataset.theme = t;
  themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
  try { localStorage.setItem("cst-theme", t); } catch {}
}
setTheme(root.dataset.theme || "light");
themeBtn.onclick = () => setTheme(root.dataset.theme === "dark" ? "light" : "dark");

const burger = $("#burger"), menu = $("#menu");
burger.onclick = () => burger.setAttribute("aria-expanded", menu.classList.toggle("open"));
menu.onclick = (e) => { if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } };

/* ---------- GPA calculator ---------- */
const GRADES = { "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, F: 0 };
const rowsBox = $("#gpa-rows");

function addCourse() {
  const grade = el("select", { ariaLabel: "Grade" });
  Object.keys(GRADES).forEach((g) => grade.append(el("option", { value: g, textContent: g })));
  grade.value = "A";
  const remove = el("button", { type: "button", className: "del", textContent: "×", title: "Remove module" });
  const row = el("div", { className: "gpa-row" },
    el("input", { placeholder: "Module name (optional)", ariaLabel: "Module name" }),
    grade,
    el("input", { type: "number", min: "0", step: "0.5", placeholder: "Credits", ariaLabel: "Credits", value: "15" }),
    remove);
  remove.onclick = () => { if (rowsBox.children.length > 1) row.remove(); };
  rowsBox.append(row);
}

function calcGPA() {
  let points = 0, credits = 0;
  for (const row of rowsBox.children) {
    const [, g, c] = row.children;
    const cr = parseFloat(c.value);
    if (!(cr > 0)) continue;
    points += GRADES[g.value] * cr;
    credits += cr;
  }
  const out = $("#gpa-result");
  out.textContent = "";
  if (!credits) { out.textContent = "Enter credits greater than 0 for at least one module."; return; }
  out.append(el("strong", { textContent: (points / credits).toFixed(2) }), `GPA across ${credits} credits`);
}

$("#add-course").onclick = addCourse;
$("#calc").onclick = calcGPA;
$("#reset-gpa").onclick = () => { rowsBox.textContent = ""; addCourse(); addCourse(); $("#gpa-result").textContent = "Your GPA will appear here."; };
addCourse(); addCourse(); addCourse();

/* ---------- Assignment tracker ---------- */
let tasks = load("cst-tasks", []);
const list = $("#task-list"), filter = $("#t-filter");
const PRI = { high: 0, med: 1, low: 2 }, PRI_LABEL = { high: "High", med: "Medium", low: "Low" };
const today = () => new Date().toISOString().slice(0, 10);

function renderTasks() {
  save("cst-tasks", tasks);
  const f = filter.value;
  const shown = tasks
    .filter((t) => f === "all" || (f === "done") === t.done)
    .sort((a, b) => a.done - b.done || a.due.localeCompare(b.due) || PRI[a.pri] - PRI[b.pri]);
  list.textContent = "";
  $("#task-count").textContent = `${tasks.filter((t) => !t.done).length} open · ${tasks.length} total`;
  if (!shown.length) { list.append(el("li", { className: "empty", textContent: "Nothing here yet. Add an assignment above." })); return; }
  shown.forEach((t) => {
    const cb = el("input", { type: "checkbox", checked: t.done, ariaLabel: "Mark complete" });
    cb.onchange = () => { t.done = cb.checked; renderTasks(); };
    const del = el("button", { className: "del", textContent: "×", title: "Delete", ariaLabel: "Delete assignment" });
    del.onclick = () => { tasks = tasks.filter((x) => x.id !== t.id); renderTasks(); };
    const overdue = !t.done && t.due < today();
    const date = new Date(t.due + "T00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    list.append(el("li", { className: "task" + (t.done ? " done" : "") },
      cb,
      el("div", { className: "task-main" },
        el("div", { className: "task-title", textContent: t.title }),
        el("div", { className: "due" + (overdue ? " overdue" : ""), textContent: (overdue ? "Overdue · " : "Due ") + date })),
      el("span", { className: "tag " + t.pri, textContent: PRI_LABEL[t.pri] }),
      del));
  });
}

$("#task-form").onsubmit = (e) => {
  e.preventDefault();
  tasks.push({ id: Date.now(), title: $("#t-title").value.trim(), due: $("#t-date").value, pri: $("#t-pri").value, done: false });
  e.target.reset();
  renderTasks();
};
filter.onchange = renderTasks;
renderTasks();

/* ---------- Notes ---------- */
const BUILT_IN = {
  HTML: [
    ["Page skeleton", "Every page needs a doctype, language and viewport tag.", '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport"\n    content="width=device-width, initial-scale=1">\n  <title>Page</title>\n</head>\n<body></body>\n</html>'],
    ["Semantic elements", "Use header, nav, main, section, article and footer instead of generic divs. Screen readers and search engines rely on them."],
    ["Forms", "Always pair inputs with labels.", '<label for="email">Email</label>\n<input id="email" type="email" required>'],
  ],
  CSS: [
    ["Flexbox", "One-dimensional layout along a row or column.", ".row {\n  display: flex;\n  gap: 1rem;\n  justify-content: space-between;\n  align-items: center;\n}"],
    ["Grid", "Two-dimensional layout. auto-fill makes a responsive grid with no media queries.", ".cards {\n  display: grid;\n  grid-template-columns:\n    repeat(auto-fill, minmax(240px, 1fr));\n}"],
    ["Custom properties", "Define values once and reuse them. Swap them to change themes.", ":root { --accent: #2383e2; }\n.btn { background: var(--accent); }"],
  ],
  Java: [
    ["Main method", "Execution starts here.", 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}'],
    ["ArrayList", "A resizable list. Use it instead of a fixed array when the size changes.", 'ArrayList<String> names = new ArrayList<>();\nnames.add("Ada");\nfor (String n : names) {\n  System.out.println(n);\n}'],
    ["Classes and objects", "A class is a blueprint. Keep fields private and expose them through methods (encapsulation)."],
  ],
  Python: [
    ["List comprehension", "Build a list in one readable line.", "squares = [n * n for n in range(10) if n % 2 == 0]"],
    ["Functions", "Use default arguments and type hints.", 'def greet(name: str, punct: str = "!") -> str:\n    return f"Hello, {name}{punct}"'],
    ["Dictionaries", "Key-value storage with fast lookup.", 'ages = {"Ada": 36}\nages["Alan"] = 41\nfor name, age in ages.items():\n    print(name, age)'],
  ],
};
let custom = load("cst-notes", []);
let cat = "HTML";
const noteBox = $("#note-list");

function renderNotes() {
  save("cst-notes", custom);
  noteBox.textContent = "";
  BUILT_IN[cat].forEach(([t, b, code]) => {
    noteBox.append(el("article", { className: "note" }, el("h3", { textContent: t }), el("p", { textContent: b }), ...(code ? [el("pre", { textContent: code })] : [])));
  });
  custom.filter((n) => n.cat === cat).forEach((n) => {
    const del = el("button", { className: "del", textContent: "×", title: "Delete note", ariaLabel: "Delete note" });
    del.onclick = () => { custom = custom.filter((x) => x.id !== n.id); renderNotes(); };
    noteBox.append(el("article", { className: "note" }, el("h3", { textContent: n.title }), el("p", { textContent: n.body }), del));
  });
}

$("#tabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  cat = b.dataset.cat;
  document.querySelectorAll("#tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
  renderNotes();
};
$("#note-form").onsubmit = (e) => {
  e.preventDefault();
  custom.push({ id: Date.now(), cat, title: $("#n-title").value.trim(), body: $("#n-body").value.trim() });
  e.target.reset();
  renderNotes();
};
renderNotes();
