import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCelebrities = query({
	handler: async (ctx) => {
		const documents = await ctx.db.query("celebrities").collect();
		return documents;
	},
});

export const vote = mutation({
	args: {
		id: v.id("celebrities"),
		score: v.number(),
	},
	handler: async (ctx, { id, score }) => {
		const celeb = await ctx.db.get(id);
		if (!celeb) throw new Error("Celebrity not found");

		const newCount = celeb.count + 1;
		const newScore = (celeb.score * celeb.count + score) / newCount;

		await ctx.db.patch(id, {
			count: newCount,
			score: newScore,
		});
	},
});
