import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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

	const offsetsById = useMemo(() => {
		if (!celebs || celebs.length === 0) return new Map<string, number>();
		const items = celebs.map((c) => ({
			id: c.id,
			topVH: scoreToVH(c.score),
		}));
		const sorted = [...items].sort((a, b) => a.topVH - b.topVH);
		const map = new Map<string, number>();
		const THRESHOLD_VH = 2; // within 2vh considered close
		let toggle = -1; // alternate left/right
		for (let i = 0; i < sorted.length; i++) {
			const prev = sorted[i - 1];
			const cur = sorted[i];
			if (i > 0 && Math.abs(cur.topVH - prev.topVH) < THRESHOLD_VH) {
				toggle = toggle * -1;
				map.set(cur.id, toggle * 10); // ±10px small stagger
			} else {
				toggle = -1;
				map.set(cur.id, 0);
			}
		}
		return map;
	}, [celebs, usableVH]);

	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [voteForId, setVoteForId] = useState<string | null>(null);
	const [voteValue, setVoteValue] = useState<string>(""); // percent string 0..100
	const voteMutation = useMutation(api.queries.vote);
	const HOVER_THRESHOLD_PX = 64; // only count as hover if within ~6px vertically
	const [viewportH, setViewportH] = useState<number>(
		typeof window !== "undefined" ? window.innerHeight : 0
	);
	useEffect(() => {
		const onResize = () => setViewportH(window.innerHeight);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	const votingCeleb = useMemo(
		() => celebs.find((c) => c.id === voteForId) ?? null,
		[celebs, voteForId]
	);

	// Precompute absolute pixel Y for each celeb (page coordinates)
	const celebPositionsPx = useMemo(() => {
		return celebs.map((c) => ({
			id: c.id,
			y: (scoreToVH(c.score) / 100) * viewportH,
		}));
	}, [celebs, viewportH, usableVH]);

	// Band handlers: compute nearest by vertical distance; closest wins
	const onBandMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
		const mousePageY = e.clientY + window.scrollY;
		if (voteForId) return;
		const centerX = window.innerWidth / 2;
		const bandRight = centerX + 64; // allow up to ~64px to the right of center
		if (e.clientX > bandRight) {
			// Do not change hovered selection when cursor is over the right-side text area
			return;
		}
		if (celebPositionsPx.length === 0) {
			setHoveredId(null);
			return;
		}
		let bestId: string | null = null;
		let bestDist = Infinity;
		for (const p of celebPositionsPx) {
			const d = Math.abs(mousePageY - p.y);
			if (d < bestDist) {
				bestDist = d;
				bestId = p.id;
			}
		}
		if (bestDist <= HOVER_THRESHOLD_PX) {
			setHoveredId(bestId);
		} else {
			setHoveredId(null);
		}
	};
	const onBandLeave = () => setHoveredId(null);

	return (
		<div
			style={styles.page}
			onMouseMove={onBandMove}
			onMouseLeave={onBandLeave}
		>
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
				celebs.map((c) => {
					const topVH = scoreToVH(c.score);
					return (
						<div
							key={c.id}
							style={{
								...styles.pin,
								top: `${topVH}vh`,
								left: `calc(50% + ${
									offsetsById.get(c.id) ?? 0
								}px)`,
							}}
						>
							<div
								className="pin-wrap"
								style={
									{
										...styles.pinWrap,
										"--avatar-size": `${pfpSize}px`,
										"--stagger": `${
											offsetsById.get(c.id) ?? 0
										}px`,
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
										width:
											hoveredId === c.id ? 124 : pfpSize,
										height:
											hoveredId === c.id ? 124 : pfpSize,
										borderRadius: 8,
										objectFit: "cover",
										display: "block",
										transition:
											"transform 200ms ease, width 200ms ease, height 200ms ease",
										transform:
											hoveredId === c.id
												? `translateX(calc(var(--avatar-size, ${pfpSize}px) + 84px - var(--stagger, 0px)))`
												: undefined,
										pointerEvents: "none",
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
											opacity: hoveredId === c.id ? 1 : 0,
											left:
												hoveredId === c.id
													? `calc(100% + 48px + 124px - var(--stagger, 0px))`
													: `calc(100% + 50px - var(--stagger, 0px))`,
											transform: "translate(0, -50%)",
											width: "auto",
											minWidth: "60ch",
											maxWidth: "min(90ch, 85vw)",
											whiteSpace: "normal",
											lineHeight: 1.6,
											pointerEvents:
												hoveredId === c.id
													? "auto"
													: "none",
											position: "absolute",
											top: "50%",
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
											display: "flex",
											alignItems: "center",
											gap: 8,
											marginTop: 8,
										}}
									>
										<span
											style={{
												fontSize: 12,
												opacity: 0.8,
											}}
										>
											{(c.score * 100).toFixed(0)}% evil
										</span>
										<button
											onClick={(ev) => {
												ev.stopPropagation();
												setVoteForId(c.id);
												setVoteValue(
													String(
														Math.round(
															c.score * 100
														)
													)
												);
											}}
											style={{
												fontSize: 12,
												padding: "2px 8px",
												borderRadius: 4,
												border: "none",
												cursor: "pointer",
												background:
													c.score <= 0.5
														? "#000"
														: "#fff",
												color:
													c.score <= 0.5
														? "#fff"
														: "#000",
											}}
										>
											Vote
										</button>
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

			{voteForId && (
				<div
					style={styles.voteModalOverlay}
					onClick={() => setVoteForId(null)}
				>
					<div
						style={styles.voteModal}
						onClick={(e) => e.stopPropagation()}
					>
						<div style={{ fontWeight: 700, marginBottom: 8 }}>
							Cast your vote
						</div>
						<label style={{ fontSize: 13, opacity: 0.9 }}>
							How evil is {votingCeleb?.name ?? "this person"}?
							(0–100%)
						</label>
						<input
							type="number"
							min={0}
							max={100}
							step={1}
							value={voteValue}
							onChange={(e) => setVoteValue(e.target.value)}
							style={{
								width: "100%",
								marginTop: 6,
								padding: "8px 10px",
								borderRadius: 6,
								border: "1px solid rgba(0,0,0,0.2)",
								boxSizing: "border-box",
							}}
						/>
						<div
							style={{
								display: "flex",
								gap: 8,
								marginTop: 12,
								justifyContent: "flex-end",
							}}
						>
							<button
								onClick={() => setVoteForId(null)}
								style={styles.voteSecondaryBtn}
							>
								Cancel
							</button>
							<button
								onClick={async () => {
									const n = Math.max(
										0,
										Math.min(100, Number(voteValue))
									);
									if (Number.isNaN(n)) return;
									try {
										await voteMutation({
											id: voteForId as any,
											score: n / 100,
										});
										setVoteForId(null);
									} catch (e) {
										console.error(e);
									}
								}}
								style={styles.votePrimaryBtn}
							>
								Vote
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Inline styles for hover since we are keeping everything in this file */}
			<style>{`
        .pin-wrap { position: relative; z-index: 1; }
        .pin-wrap img { will-change: transform; }
        .hover-card { transition: opacity 220ms ease, left 220ms ease; }
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
	voteModalOverlay: {
		position: "fixed",
		inset: 0,
		background: "rgba(0,0,0,0.15)",
		zIndex: 200,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	voteModal: {
		width: 320,
		maxWidth: "90vw",
		background: "#fff",
		color: "#000",
		borderRadius: 12,
		boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
		padding: 16,
	},
	votePrimaryBtn: {
		fontSize: 13,
		padding: "6px 10px",
		borderRadius: 6,
		border: "none",
		cursor: "pointer",
		background: "#111",
		color: "#fff",
	},
	voteSecondaryBtn: {
		fontSize: 13,
		padding: "6px 10px",
		borderRadius: 6,
		border: "1px solid rgba(0,0,0,0.2)",
		cursor: "pointer",
		background: "transparent",
		color: "#111",
	},
};
