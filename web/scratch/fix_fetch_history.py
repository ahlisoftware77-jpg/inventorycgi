import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Modify fetchHistory signature
target_fetch = """  const fetchHistory = async () => {
    if (historyData.length > 0) return;"""

replacement_fetch = """  const fetchHistory = async (force: boolean = false) => {
    if (!force && historyData.length > 0) return;"""

content = content.replace(target_fetch, replacement_fetch)

# 2. Modify handleSave end
target_save_end = """      localStorage.removeItem("formDarDraft"); // Bersihkan draft setelah sukses simpan
      setHistoryData([]); // Reset history to refetch next time
    } catch (e) {"""

replacement_save_end = """      localStorage.removeItem("formDarDraft"); // Bersihkan draft setelah sukses simpan
      fetchHistory(true); // Refetch automatically to update datalists
    } catch (e) {"""

content = content.replace(target_save_end, replacement_save_end)

# 3. Modify handleImportExcel end
target_import_end = """        setHistoryData([]); // reset so it reloads
        fetchHistory();
        
      } catch (err) {"""

replacement_import_end = """        fetchHistory(true);
        
      } catch (err) {"""

content = content.replace(target_import_end, replacement_import_end)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
