import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCelebrities = query({
	handler: async (ctx) => {
		const documents = await ctx.db.query("celebrities").collect();
		return documents;
	},
});
