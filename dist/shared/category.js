"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCategoryHierarchy = buildCategoryHierarchy;
exports.checkAndInsertCategory = checkAndInsertCategory;
exports.saveCategoryHierarchy = saveCategoryHierarchy;
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
class CategoryNode {
    name;
    lft;
    rgt;
    children;
    constructor(name, lft, rgt) {
        this.name = name;
        this.lft = lft;
        this.rgt = rgt;
        this.children = [];
    }
    addChild(child) {
        this.children.push(child);
    }
    displayHierarchy(indent = "") {
        console.log(indent + this.name + " " + this.lft + " " + this.rgt);
        for (const child of this.children) {
            child.displayHierarchy(indent + "  ");
        }
    }
    toJSON() {
        const children = this.children.map((child) => child.toJSON());
        return {
            name: this.name,
            lft: this.lft,
            rgt: this.rgt,
            children: children.length > 0 ? children : undefined,
        };
    }
    displayHierarchyAsJSON() {
        console.log(JSON.stringify(this.toJSON(), null, 2));
    }
}
exports.default = CategoryNode;
function buildCategoryHierarchy(categories, lft, rgt) {
    if (categories.length === 0)
        return null; // Base case: no more categories
    // Create the root node with the given lft and rgt
    const root = new CategoryNode(categories[0], lft, rgt);
    if (categories.length > 1) {
        // Recursive case: create the child with the next available lft and rgt
        const childLft = lft + 1;
        const childRgt = rgt - 1;
        const child = buildCategoryHierarchy(categories.slice(1), childLft, childRgt);
        // Add the child node to the root's children
        root.addChild(child);
    }
    return root;
}
async function checkAndInsertCategory(catNode, parentId = null) {
    try {
        console.error("Name of cat node = ", catNode.name);
        console.error("Name of cat node trim = ", catNode.name.trim());
        const { data: existData, error } = await supabase
            .from("category")
            .select("id")
            .eq("name", catNode.name)
            .single();
        console.error("\n\n Exist data of category");
        console.log(existData);
        if (error || !existData) {
            const { data: insertData, error: insertError } = await supabase
                .from("category")
                .insert({
                name: catNode.name,
                lft: catNode.lft,
                rgt: catNode.rgt,
                parent_id: parentId
            })
                .select();
            if (insertError)
                throw insertError;
            return insertData[0].id;
        }
        return existData.id;
    }
    catch (error) {
        console.error("Error in checkAndInsertCategory:", error.message);
        throw error;
    }
}
async function saveCategoryHierarchy(node, parentId = null) {
    const categoryId = await checkAndInsertCategory(node, parentId);
    // Recursively save all child nodes
    for (const child of node.children) {
        await saveCategoryHierarchy(child, categoryId);
    }
    return categoryId;
}
//# sourceMappingURL=category.js.map