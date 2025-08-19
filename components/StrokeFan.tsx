import HanziWriter, { type CharacterData } from "hanzi-writer"; // ⚠️ voir note plus bas
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";

type Props = { char: string; size?: number };

async function loadCharacterDataOffline(_char: string): Promise<CharacterData> {
	throw new Error("Offline data loader not implemented");
}

export const StrokeFan: React.FC<Props> = ({ char, size = 60 }) => {
	const [strokes, setStrokes] = useState<string[]>([]);

	useEffect(() => {
		let mounted = true;
		HanziWriter.loadCharacterData(char)
			.then((data) => {
				if (mounted) setStrokes(data.strokes);
			})
			.catch(async () => {
				try {
					const offline = await loadCharacterDataOffline(char);
					if (mounted) setStrokes(offline.strokes);
				} catch {
					if (mounted) setStrokes([]);
				}
			});
		return () => {
			mounted = false;
		};
	}, [char]);

	if (strokes.length === 0) return null;

	return (
		<View
			style={{
				flexDirection: "row",
				flexWrap: "wrap",
				gap: 8,
				justifyContent: "center",
			}}
		>
			{strokes.map((_, index) => (
				<Svg
					key={index}
					width={size}
					height={size}
					viewBox="0 0 1024 1024"
					preserveAspectRatio="xMidYMid meet"
				>
					<G stroke="#DDD" strokeWidth={8}>
						<Rect x={0} y={0} width={1024} height={1024} fill={"none"} />
						<Path d="M0 0 L1024 1024" />
						<Path d="M1024 0 L0 1024" />
						<Path d="M512 0 L512 1024" />
						<Path d="M0 512 L1024 512" />
					</G>
					<G transform="scale(1,-1) translate(0,-1024)">
						{strokes.slice(0, index + 1).map((d, i) => (
							<Path
								key={i}
								d={d}
								stroke="#000"
								strokeWidth={12} // ajusté, voir point 2
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="black"
							/>
						))}
					</G>
				</Svg>
			))}
		</View>
	);
};
