import os

# 1. Update Sidebar
sidebar_path = "src/components/dashboard/sidebar-nav.tsx"
with open(sidebar_path, "r", encoding="utf-8") as f:
    sidebar_content = f.read()

target_sidebar = """    { id: 'logs', label: 'Log Aktivitas', icon: ListTodo, href: '/logs', hide: isUserRole },
    { id: 'form_app', label: 'Form APP (DAR)', icon: FileText, href: '/form-app', hide: !(isAdmin || (user && formAppUsers.includes(user.uid))) },"""
replacement_sidebar = """    { id: 'logs', label: 'Log Aktivitas', icon: ListTodo, href: '/logs', hide: isUserRole },
    { id: 'register_design', label: 'Register Design', icon: FileText, href: '/register-design', hide: !(isAdmin || (user && formAppUsers.includes(user.uid))) },
    { id: 'form_app', label: 'Form APP (DAR)', icon: FileText, href: '/form-app', hide: !(isAdmin || (user && formAppUsers.includes(user.uid))) },"""
sidebar_content = sidebar_content.replace(target_sidebar, replacement_sidebar)

with open(sidebar_path, "w", encoding="utf-8") as f:
    f.write(sidebar_content)

# 2. Update Task Checklist
task_path = r"C:\Users\00563\.gemini\antigravity-ide\brain\8b62d400-178f-4101-b637-45a41851ddf4\task.md"
with open(task_path, "r", encoding="utf-8") as f:
    task_content = f.read()

task_content = task_content.replace("- `[ ]` Tambahkan link \"Register Design\" di `sidebar.tsx`.", "- `[x]` Tambahkan link \"Register Design\" di `sidebar.tsx`.")
task_content = task_content.replace("- `[/]` **1. Sidebar Navigation**", "- `[x]` **1. Sidebar Navigation**")

with open(task_path, "w", encoding="utf-8") as f:
    f.write(task_content)

print("Done")
