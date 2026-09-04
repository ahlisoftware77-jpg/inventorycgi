import re

f = open('src/components/dashboard-design-summary.tsx', encoding='utf-8').read()

# 1. Add customerData and designerData useMemo blocks
new_memos = '''
  const customerData = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach(d => {
      if (d.customer) {
        counts.set(d.customer, (counts.get(d.customer) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [data]);

  const designerData = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach(d => {
      if (d.designer) {
        counts.set(d.designer, (counts.get(d.designer) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [data]);
'''

if "const customerData = useMemo" not in f:
    f = f.replace("  if (loading) {", new_memos + "\n  if (loading) {")

# 2. Add two new Cards for the charts in a new grid below the first grid
new_charts = '''
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <Card className="shadow-md border-slate-200">
          <CardHeader>
            <CardTitle>Top 10 Customer</CardTitle>
            <CardDescription>Distribusi desain berdasarkan pelanggan terbanyak</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" name="Total Desain" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200">
          <CardHeader>
            <CardTitle>Top 10 Designer</CardTitle>
            <CardDescription>Distribusi desain berdasarkan desainer paling aktif</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={designerData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" name="Total Desain" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
'''

if "Top 10 Customer" not in f:
    f = f.replace("    </div>\n  );\n}", new_charts + "    </div>\n  );\n}")

with open('src/components/dashboard-design-summary.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
