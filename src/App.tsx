import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// NOTE: Interpreting "the whole site should be 2 vh tall" as full viewport height (100vh)
// so the layout can meaningfully show top/bottom halves and a center timeline.

type Celebrity = {
	id: string;
	name: string;
	desc: string;
	score: number; // 0 = good (top), 1 = evil (bottom)
	img: string;
};

const CELEB_IMG =
	"https://upload.wikimedia.org/wikipedia/commons/0/05/Robin_Williams_2011a_%282%29.jpg";

export default function App() {
	// Layout constants
	const timelineTopVH = 15; // top margin from viewport top
	const timelineBottomVH = 15; // bottom margin from viewport bottom
	const pageVH = 200; // total page height in vh (two 100vh sections)
	const timelineWidthPx = 6;
	const pfpSize = 72;

	// Load celebrities from Convex. Adjust the path below if your function file name differs.
	// For example, if your function lives in convex/celebs.ts export getCelebrities,
	// use api.celebs.getCelebrities instead.
	const documents = useQuery(api.queries.getCelebrities);

	const celebs: Celebrity[] = useMemo(() => {
		if (!documents) return [];
		return documents.map((d: any, i: number) => ({
			id: String(d._id ?? i),
			name: d.name ?? "Unknown",
			desc: typeof d.reason === "string" ? d.reason : "Temporary reason",
			score:
				typeof d.score === "number"
					? Math.min(Math.max(d.score, 0), 1)
					: 0.5,
			img: d.image_url ?? CELEB_IMG,
		}));
	}, [documents]);

	// Compute timeline usable height in vh
	const usableVH = useMemo(
		() => pageVH - (timelineTopVH + timelineBottomVH),
		[pageVH, timelineTopVH, timelineBottomVH]
	);

	// Convert score (0..1) to top offset in vh along the timeline
	const scoreToVH = (score: number) => timelineTopVH + score * usableVH;

	return (
		<div style={styles.page}>
			<div style={styles.bgWrap}>
				<div style={styles.topHalf} />
				<div style={styles.bottomHalf} />
			</div>

			{/* Logo in top-right corner */}
			<img src="/logo.png" alt="Site Logo" style={styles.logo} />

			{/* Center vertical timeline */}
			<div style={{ ...styles.timeline, width: timelineWidthPx }} />

			{/* Celebrities pinned on the line */}
			{celebs &&
				celebs.map((c, idx) => {
					const topVH = scoreToVH(c.score);
					return (
						<div
							key={c.id}
							style={{
								...styles.pin,
								top: `${topVH}vh`,
								left: "50%",
							}}
						>
							<div
								className="pin-wrap"
								style={
									{
										...styles.pinWrap,
										"--avatar-size": `${pfpSize}px`,
									} as React.CSSProperties
								}
							>
								<img
									src={c.img}
									alt={c.name}
									width={pfpSize}
									height={pfpSize}
									referrerPolicy="no-referrer"
									style={{
										width: pfpSize,
										height: pfpSize,
										borderRadius: 8,
										objectFit: "cover",
										display: "block",
										transition: "transform 160ms ease",
									}}
								/>
								<div
									className="hover-card"
									style={
										{
											...styles.hoverCard,
											color:
												c.score <= 0.5
													? "#000"
													: "#fff",
										} as React.CSSProperties
									}
								>
									<div
										style={{
											fontWeight: 700,
											fontSize: 22,
											lineHeight: 1.2,
										}}
									>
										{c.name}
									</div>
									<div
										style={{
											fontSize: 14,
											opacity: 0.9,
											marginTop: 6,
										}}
									>
										{c.desc}
									</div>
									<div
										style={{
											fontSize: 11,
											opacity: 0.7,
											marginTop: 6,
										}}
									>
										Score: {c.score.toFixed(2)}
									</div>
								</div>
							</div>
						</div>
					);
				})}

			{/* Floating emojis on the left side */}
			<div style={styles.emojisLeft}>
				{["👼", "🥹", "😍", "👍", "🥀", "😔", "😡", "🤢"].map(
					(emoji, idx) => (
						<div
							key={idx}
							style={{
								...styles.emoji,
								...styles[`emoji${idx}`],
							}}
						>
							{emoji}
						</div>
					)
				)}
			</div>

			{/* Inline styles for hover since we are keeping everything in this file */}
			<style>{`
        .pin-wrap { position: relative; z-index: 1; }
        .pin-wrap img { will-change: transform; }
        .hover-card {
          position: absolute;
          top: 50%;
          left: calc(100% + 14px); /* closer to the avatar at rest */
          transform: translate(0, -50%);
          width: auto;
          min-width: 60ch;           /* ensure ~60 characters before wrapping */
          max-width: min(90ch, 85vw);/* cap so it doesn’t sprawl on huge screens */
          white-space: normal;       /* allow normal wrapping */
          opacity: 0;
          pointer-events: none;
          transition: opacity 220ms ease, transform 220ms ease, left 220ms ease;
          line-height: 1.6;
          overflow: visible;
        }
        .pin-wrap:hover { z-index: 5; }
        .pin-wrap:hover img {
          width: 124px !important;
          height: 124px !important;
          transform: translateX(calc(var(--avatar-size, 72px) + 16px));
          transition: transform 200ms ease, width 200ms ease, height 200ms ease;
        }
        .pin-wrap:hover .hover-card {
          opacity: 1;
          /* after the image expands, keep text close: 12px gap */
          left: calc(100% + 12px + 124px);
          transform: translate(0, -50%);
        }
      `}</style>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	page: {
		position: "relative",
		height: "200vh", // see note at file top
		width: "100vw",
		overflow: "visible",
		fontFamily:
			"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
	},
	bgWrap: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: "200vh",
		overflow: "hidden",
		zIndex: 0,
	},
	topHalf: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: "100vh",
		background: "linear-gradient(to bottom, #FFFFFF, #C6EBFF)",
	},
	bottomHalf: {
		position: "absolute",
		top: "100vh",
		left: 0,
		right: 0,
		height: "100vh",
		background: "linear-gradient(to bottom, #957B72, #AB2222)",
	},
	timeline: {
		position: "absolute",
		top: "15vh",
		height: "calc(200vh - 30vh)",
		left: "50%",
		transform: "translateX(-50%)",
		borderRadius: 999,
		background:
			"linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.25))",
		boxShadow:
			"inset 0 0 2px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.25)",
		zIndex: 10,
	},
	pin: {
		position: "absolute",
		transform: "translate(-50%, -50%)",
		zIndex: 20,
	},
	pinWrap: {
		position: "relative",
	},
	hoverCard: {},
	emojisLeft: {
		position: "absolute",
		top: 0,
		left: 0,
		height: "200vh",
		width: "100vw",
		display: "flex",
		flexDirection: "column",
		justifyContent: "space-between",
		alignItems: "flex-start",
		pointerEvents: "none",
		zIndex: 5,
	},
	emoji: {
		fontSize: 128,
		transformOrigin: "center",
		userSelect: "none",
	},
	emoji0: {
		transform: "rotate(-10deg)",
		marginLeft: "30vw",
		marginTop: "6vh",
	},
	emoji1: { transform: "rotate(6deg)", marginLeft: "15vw" },
	emoji2: { transform: "rotate(-5deg)", marginLeft: "26vw" },
	emoji3: { transform: "rotate(4deg)", marginLeft: "18vw" },
	emoji4: { transform: "rotate(-7deg)", marginLeft: "24vw" },
	emoji5: { transform: "rotate(8deg)", marginLeft: "12vw" },
	emoji6: { transform: "rotate(-4deg)", marginLeft: "28vw" },
	emoji7: {
		transform: "rotate(5deg)",
		marginLeft: "17vw",
		marginBottom: "6vh",
	},
	logo: {
		position: "absolute",
		top: -64,
		right: 16,
		width: 350,
		height: "auto",
		zIndex: 100,
	},
};
