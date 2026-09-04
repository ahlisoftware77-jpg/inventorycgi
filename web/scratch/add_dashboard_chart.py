import re

def main():
    filepath = 'src/components/dashboard/dashboard-content.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add import
    if 'import DesignTypeChart' not in content:
        content = content.replace(
            "import MutationActivityChart from './mutation-activity-chart';",
            "import MutationActivityChart from './mutation-activity-chart';\nimport DesignTypeChart from './design-type-chart';"
        )

    # Insert chart in grid
    # Looking for:
    # <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
    #   <MutationActivityChart assets={assets} />
    #   <DisposalActivityChart assets={assets} />
    # </div>
    
    old_grid = """            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              <MutationActivityChart assets={assets} />
              <DisposalActivityChart assets={assets} />
            </div>"""

    new_grid = """            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <MutationActivityChart assets={assets} />
              <DisposalActivityChart assets={assets} />
              <DesignTypeChart />
            </div>"""
    
    content = content.replace(old_grid, new_grid)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done refactoring dashboard content.")

if __name__ == "__main__":
    main()
