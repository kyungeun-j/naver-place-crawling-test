/**
 * 네이버 지도 URL에서 Place ID를 추출하고 모바일 Place URL로 변환하는 유틸리티
 */

export interface PlaceData {
  siteId: string;
  road: string;
  category: string;
  categoryCode: string;
  categoryCodeList: string[];
  categoryCount: number;
  rcode: string;
  roadAddress: string;
  address: string;
  streetPanorama?: {
    _ref?: string;
  };
}

/**
 * 네이버 지도 URL에서 Place ID 추출
 */
export function extractPlaceId(url: string): string | null {
  try {
    // URL에서 place/숫자 패턴 찾기
    const placeMatch = url.match(/place\/(\d+)/);
    if (placeMatch) {
      return placeMatch[1];
    }

    // restaurant/숫자 패턴도 확인 (모바일 URL인 경우)
    const restaurantMatch = url.match(/restaurant\/(\d+)/);
    if (restaurantMatch) {
      return restaurantMatch[1];
    }

    return null;
  } catch (error) {
    console.error("Place ID 추출 중 오류:", error);
    return null;
  }
}

/**
 * Place ID를 모바일 Place URL로 변환
 */
export function convertToMobilePlaceUrl(placeId: string): string {
  return `https://m.place.naver.com/restaurant/${placeId}/home?entry=ple`;
}

/**
 * 네이버 지도 URL을 모바일 Place URL로 변환
 */
export function convertMapUrlToPlaceUrl(mapUrl: string): string | null {
  const placeId = extractPlaceId(mapUrl);
  if (!placeId) {
    return null;
  }
  return convertToMobilePlaceUrl(placeId);
}

/**
 * URL이 유효한 네이버 지도/플레이스 URL인지 확인 (naver.me 단축 URL 포함)
 */
export function isValidNaverUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // 네이버 지도, 플레이스 도메인 및 단축 URL 확인
    return (
      hostname === "naver.me"
    );
  } catch {
    return false;
  }
}
