import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { scrapePlaceData } from "@/lib/place-scraper";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { url } = body;

		if (!url || typeof url !== "string") {
			return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
		}

		// 네이버 지도/플레이스 URL 유효성 검사
		const isValidUrl =
			url.includes("naver.me") ||
			url.includes("map.naver.com") ||
			url.includes("m.place.naver.com");

		if (!isValidUrl) {
			return NextResponse.json(
				{
					error: "유효한 네이버 지도/플레이스 URL이 아닙니다.",
				},
				{ status: 400 },
			);
		}

		// 데이터 스크래핑
		const placeData = await scrapePlaceData(url);
		if (!placeData) {
			return NextResponse.json(
				{ error: "데이터를 가져올 수 없습니다." },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				originalUrl: url,
				placeData,
			},
		});
	} catch (error) {
		console.error("API 오류:", error);
		return NextResponse.json(
			{ error: "서버 오류가 발생했습니다." },
			{ status: 500 },
		);
	}
}
