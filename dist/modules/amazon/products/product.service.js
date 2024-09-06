"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const scraper_1 = require("../../../shared/actions/scraper");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
class BaseProductService {
    createProduct = async (req, res, next) => {
        // return new Promise();
        const { url } = req.body;
        (0, scraper_1.scrapeAmazonProduct)(url);
        return null;
    };
    getProductById = async (req, res, next) => {
        try {
            console.log(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            const { data, error } = await supabase
                .from("products")
                .select()
                .eq("id", Number(req.params.id));
            console.log("Thien");
            console.log(req.params.id);
            console.log(data);
        }
        catch (error) {
            console.log(error);
        }
    };
}
exports.default = BaseProductService;
//# sourceMappingURL=product.service.js.map