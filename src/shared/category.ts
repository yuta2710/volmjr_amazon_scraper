import { createClient } from "@supabase/supabase-js";
import { Database } from "../shared/types/database.types";

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

export default class CategoryNode {
  name: string;
  lft?: number;
  rgt?: number;
  children: CategoryNode[];

  constructor(name: string, lft?: number, rgt?: number) {
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

  displayHierarchyAsJSON(): void {
    console.log(JSON.stringify(this.toJSON(), null, 2));
  }
}

export function buildCategoryHierarchy(
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
    const child = buildCategoryHierarchy(
      categories.slice(1),
      childLft,
      childRgt,
    );
    // Add the child node to the root's children
    root.addChild(child);
  }

  return root;
}

export async function checkAndInsertCategory(
  catNode: CategoryNode,
  parentId: number | null = null,
): Promise<number> {
  const { data, error } = await supabase
    .from("category")
    .select("id")
    .eq("name", catNode.name)
    .eq("parent_id", parentId)
    .single();

  if(error || !data) {
    const { data: insertData, error: insertError } = await supabase
    .from("category")
    .insert({
      name: catNode.name,
      lft: catNode.lft,
      rgt: catNode.rgt,
      parent_id: parentId
    })
    .select();

    if (insertError) throw insertError;
    return insertData[0].id;
  }

  return data.id;
}


export async function saveCategoryHierarchy(node: CategoryNode, parentId: number | null = null): Promise<void> {
  const categoryId = await checkAndInsertCategory(node, parentId);

  // Recursively save all child nodes
  for (const child of node.children) {
    await saveCategoryHierarchy(child, categoryId);
  }
}