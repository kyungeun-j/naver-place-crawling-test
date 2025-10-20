import type { NaverPlaceData } from "@/types";

// user agent
const MOBILE_USER_AGENT =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
// max reviews
const MAX_REVIEWS = 5;

// Place ID 추출
function extractPlaceId(url: string): string | null {
	return url.match(/place\/(\d+)/)?.[1] || null;
}

// Place ID로 place url 생성
function buildMobileUrl(placeId: string): string {
	return `https://m.place.naver.com/place/${placeId}/review/visitor?entry=ple`;
}

// place url로 변환
async function resolveMobileUrl(url: string): Promise<string> {
	// place url 이면 그대로 반환
	if (url.includes("m.place.naver.com")) {
		return url;
	}

	// map url인 경우
	if (url.includes("map.naver.com")) {
		const placeId = extractPlaceId(url);
		if (!placeId) throw new Error("Place ID를 찾을 수 없습니다.");
		return buildMobileUrl(placeId);
	}

	// 단축 url인 경우
	const response = await fetch(url, {
		method: "HEAD",
		redirect: "manual",
		headers: { "User-Agent": MOBILE_USER_AGENT },
	});

	const location = response.headers.get("location");
	if (!location) throw new Error("리다이렉트 URL을 찾을 수 없습니다.");

	// place url
	if (location.includes("m.place.naver.com")) {
		return location;
	}

	// map url -> place url
	const placeId = extractPlaceId(location);
	if (!placeId) throw new Error("Place ID를 찾을 수 없습니다.");

	return buildMobileUrl(placeId);
}

// HTML에서 Apollo State JSON 추출
function parseApolloState(html: string): Record<string, unknown> | null {
	const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});/);
	if (!match) return null;

	try {
		return JSON.parse(match[1]);
	} catch (error) {
		console.error("Apollo State 파싱 오류:", error);
		return null;
	}
}

// Apollo State에서 데이터 추출
function extractPlaceData(
	jsonData: Record<string, unknown> | null,
): NaverPlaceData | null {
	if (!jsonData) return null;

	let placeDetail: Record<string, unknown> | null = null;
	const reviews: Array<{ id: string; content: string }> = [];

	for (const [key, value] of Object.entries(jsonData)) {
		const record = value as Record<string, unknown>;

		// 매장 정보
		if (
			key.startsWith("PlaceDetailBase:") &&
			record.__typename === "PlaceDetailBase"
		) {
			placeDetail = record;
		}

		// 리뷰 (최대 MAX_REVIEWS개)
		if (
			key.startsWith("VisitorReview:") &&
			reviews.length < MAX_REVIEWS &&
			record.__typename === "VisitorReview"
		) {
			const content = (record.body ||
				record.text ||
				record.content ||
				record.contents) as string;

			// 유효한 텍스트가 있는 리뷰만 추가
			if (content?.trim() && /[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]/.test(content)) {
				reviews.push({
					id: record.id as string,
					content,
				});
			}
		}
	}

	if (!placeDetail) return null;

	// 최종 데이터 반환
	return {
		siteId: (placeDetail.id as string) || "",
		category: (placeDetail.category as string) || "",
		roadAddress: (placeDetail.roadAddress as string) || "",
		title: (placeDetail.name || placeDetail.displayName) as string,
		phone: placeDetail.phone as string,
		virtualPhone: placeDetail.virtualPhone as string,
		// 중복 제거
		reviews:
			reviews.length > 0
				? reviews.filter(
						(review, index, arr) =>
							arr.findIndex((r) => r.id === review.id) === index,
					)
				: undefined,
	};
}

// 메인 함수: 네이버 플레이스 데이터 스크래핑
export async function scrapePlaceData(
	url: string,
): Promise<NaverPlaceData | null> {
	try {
		// place url 확보
		const mobileUrl = await resolveMobileUrl(url);

		// HTML 가져오기
		const response = await fetch(mobileUrl, {
			headers: {
				"User-Agent": MOBILE_USER_AGENT,
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
				"Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
				"Accept-Encoding": "gzip, deflate, br",
				Referer: "https://m.naver.com/",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const html = await response.text();

		// Apollo State 추출
		const apolloState = parseApolloState(html);
		if (!apolloState) {
			console.error("Apollo State를 찾을 수 없습니다.");
			return null;
		}

		// 데이터 추출
		return extractPlaceData(apolloState);
	} catch (error) {
		console.error("스크래핑 오류:", error);
		return null;
	}
}
