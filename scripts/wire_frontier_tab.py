import os

desk_path = r"d:\Anti-gravity\expedite-consults\expedite-consults\noctis-ai\src\components\noctis\NoctisDesk.tsx"
with open(desk_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Import NoctisFrontierTab
import_target = 'import { NoctisForgeTab } from "@/components/noctis/NoctisForgeTab";'
import_repl = 'import { NoctisForgeTab } from "@/components/noctis/NoctisForgeTab";\nimport { NoctisFrontierTab } from "@/components/noctis/NoctisFrontierTab";'
assert import_target in text, "import_target not found"
text = text.replace(import_target, import_repl, 1)

# 2. Update desk state type
type_target = 'const [desk, setDesk] = useState<"chat" | "study" | "forge" | "plugins" | "console" | "redteam">("chat");'
type_repl = 'const [desk, setDesk] = useState<"chat" | "study" | "forge" | "plugins" | "console" | "redteam" | "frontier">("chat");'
assert type_target in text, "type_target not found"
text = text.replace(type_target, type_repl, 1)

# 3. Add menu button in menu
btn_target = """        <button
          type="button"
          onClick={() => {
            setDesk("plugins");
            setMenu(false);
          }}
          className={item(desk === "plugins")}
        >
          <Layers className="size-4 shrink-0 text-sky-400" />
          <span>Plugins & Systems</span>
          <span className="ml-auto rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">50+</span>
        </button>"""

btn_repl = """        <button
          type="button"
          onClick={() => {
            setDesk("plugins");
            setMenu(false);
          }}
          className={item(desk === "plugins")}
        >
          <Layers className="size-4 shrink-0 text-sky-400" />
          <span>Plugins & Systems</span>
          <span className="ml-auto rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">50+</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setDesk("frontier");
            setMenu(false);
          }}
          className={item(desk === "frontier")}
        >
          <Cpu className="size-4 shrink-0 text-violet-400" />
          <span>Frontier & Benchmarks</span>
          <span className="ml-auto rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">500+</span>
        </button>"""

assert btn_target in text, "btn_target not found"
text = text.replace(btn_target, btn_repl, 1)

# 4. Render NoctisFrontierTab
render_target = """            ) : desk === "forge" ? (
              <NoctisForgeTab
                onSendToChat={(taskPrompt) => {
                  setDesk("chat");
                  void send(taskPrompt);
                }}
                onClose={() => setDesk("chat")}
                onOpenInCanvas={(title, md) => openInCanvas(title, md)}
              />
            ) : empty ? ("""

render_repl = """            ) : desk === "forge" ? (
              <NoctisForgeTab
                onSendToChat={(taskPrompt) => {
                  setDesk("chat");
                  void send(taskPrompt);
                }}
                onClose={() => setDesk("chat")}
                onOpenInCanvas={(title, md) => openInCanvas(title, md)}
              />
            ) : desk === "frontier" ? (
              <NoctisFrontierTab
                onSendToChat={(taskPrompt) => {
                  setDesk("chat");
                  void send(taskPrompt);
                }}
                onClose={() => setDesk("chat")}
              />
            ) : empty ? ("""

assert render_target in text, "render_target not found"
text = text.replace(render_target, render_repl, 1)

with open(desk_path, "w", encoding="utf-8") as f:
    f.write(text)

print("[+] Successfully wired NoctisFrontierTab into NoctisDesk.tsx")
