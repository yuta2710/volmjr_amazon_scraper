"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
class AmazonCategoryRepository {
    categoryRepository;
    constructor(supabaseUrl = process.env.SUPABASE_URL, supabaseAnonKey = process.env.SUPABASE_ANON_KEY) {
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase URL and Anon Key must be provided');
        }
        this.categoryRepository = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
    }
    async checkAndInsertCategory(catNode, parentId = null) {
        try {
            console.error("Name of cat node = ", catNode.name);
            console.error("Name of cat node trim = ", catNode.name.trim());
            const { data: existData, error } = await this.categoryRepository
                .from("category")
                .select("id")
                .eq("name", catNode.name)
                .single();
            console.error("\n\n Exist data of category");
            console.log(existData);
            if (error || !existData) {
                const { data: insertData, error: insertError } = await this.categoryRepository
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
    async saveCategoryHierarchy(node, parentId = null) {
        const categoryId = await this.checkAndInsertCategory(node, parentId);
        // Recursively save all child nodes
        if (node.children) {
            for (const child of node.children) {
                await this.saveCategoryHierarchy(child, categoryId);
            }
            return categoryId;
        }
    }
}
exports.default = AmazonCategoryRepository;
//# sourceMappingURL=category.repository.js.map