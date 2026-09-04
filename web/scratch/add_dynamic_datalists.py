import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add fetchHistory() on mount (remove dependency on isHistoryOpen)
target_effect = """  useEffect(() => {
    if (isHistoryOpen) {
      fetchHistory();
    }
  }, [isHistoryOpen]);"""

replacement_effect = """  useEffect(() => {
    fetchHistory();
  }, []); // Fetch history immediately so autocomplete datalists are populated"""

content = content.replace(target_effect, replacement_effect)

# 2. Add dynamic variables above the return statement
target_return = """  return (
    <DashboardLayout>"""

replacement_return = """  const defaultTypeDesign = ["CG", "CGI", "CGI-A", "ST", "CGL", "CO"];
  const dynamicTypeDesignOptions = Array.from(new Set([
    ...defaultTypeDesign,
    ...historyData.map(r => r.typeDesign).filter(Boolean)
  ])).sort();

  const defaultDesignSource = ["MidJourney", "Shutterstock", "Create"];
  const dynamicDesignSourceOptions = Array.from(new Set([
    ...defaultDesignSource,
    ...historyData.map(r => r.designSource).filter(Boolean)
  ])).sort();

  return (
    <DashboardLayout>"""

content = content.replace(target_return, replacement_return)


# 3. Replace static datalists with dynamic ones
target_datalist = """      <datalist id="typeDesainOptions">
          <option value="CG" />
          <option value="CGI" />
          <option value="CGI-A" />
          <option value="ST" />
          <option value="CGL" />
          <option value="CO" />
      </datalist>
      <datalist id="sumberDesainOptions">
          <option value="MidJourney" />
          <option value="Shutterstock" />
          <option value="Create" />
      </datalist>"""

replacement_datalist = """      <datalist id="typeDesainOptions">
          {dynamicTypeDesignOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>
      <datalist id="sumberDesainOptions">
          {dynamicDesignSourceOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>"""

content = content.replace(target_datalist, replacement_datalist)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
