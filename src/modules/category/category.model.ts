export class CategoryNode {
  name: string;
  lft?: number;
  rgt?: number;
  children: CategoryNode[];

  constructor(name?: string, lft?: number, rgt?: number) {
    this.name = name;
    this.lft = lft;
    this.rgt = rgt;
    this.children = [];
  }

  addChild(child: CategoryNode): void {
    this.children.push(child);
  }

  displayHierarchy(indent: string = ""): void {
    console.log(indent + this.name + " " + this.lft + " " + this.rgt);
    for (const child of this.children) {
      child.displayHierarchy(indent + "  ");
    }
  }

  toJSON(): object {
    const children = this.children.map((child) => child.toJSON());
    return {
      name: this.name,
      lft: this.lft,
      rgt: this.rgt,
      children: children.length > 0 ? children : undefined,
    };
  }

  displayHierarchyAsJSON(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }
}

// Category Helper function 
export class CategoryHelper {
  buildCategoryHierarchy(
    categories: string[],
    lft: number,
    rgt: number,
  ): CategoryNode {
    if (categories.length === 0) return null; // Base case: no more categories
  
    // Create the root node with the given lft and rgt
    const root = new CategoryNode(categories[0], lft, rgt);
  
    if (categories.length > 1) {
      // Recursive case: create the child with the next available lft and rgt
      const childLft = lft + 1;
      const childRgt = rgt - 1;
      const child = this.buildCategoryHierarchy(
        categories.slice(1),
        childLft,
        childRgt,
      );
      // Add the child node to the root's children
      root.addChild(child);
    }
  
    return root;
  }
}