"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryHelper = exports.CategoryNode = void 0;
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
exports.CategoryNode = CategoryNode;
class CategoryHelper {
    buildCategoryHierarchy(categories, lft, rgt) {
        if (categories.length === 0)
            return null; // Base case: no more categories
        // Create the root node with the given lft and rgt
        const root = new CategoryNode(categories[0], lft, rgt);
        if (categories.length > 1) {
            // Recursive case: create the child with the next available lft and rgt
            const childLft = lft + 1;
            const childRgt = rgt - 1;
            const child = this.buildCategoryHierarchy(categories.slice(1), childLft, childRgt);
            // Add the child node to the root's children
            root.addChild(child);
        }
        return root;
    }
}
exports.CategoryHelper = CategoryHelper;
//# sourceMappingURL=category.model.js.map