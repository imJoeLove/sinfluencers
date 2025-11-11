import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	celebrities: defineTable({
		name: v.string(),
		score: v.number(),
		count: v.number(),
		reason: v.string(),
		image_url: v.string(),
	}),
});
