import type { PlaceData } from "./place-utils";

/**
 * 네이버 플레이스 데이터 스크래핑 기능
 */

export interface ScrapedPlaceData extends PlaceData {
  title?: string;
  description?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  phone?: string;
  virtualPhone?: string;
  website?: string;
  hours?: string;
  reviews?: ReviewData[];
}

export interface ReviewData {
  id?: string;
  author?: string;
  rating?: number;
  content?: string;
  date?: string;
  imageUrls?: string[];
  isOwner?: boolean;
  likeCount?: number;
}

/**
 * 단축 URL을 실제 URL로 변환하고 모바일 URL로 변환
 */
async function resolveShortUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      },
    });

    const location = response.headers.get('location');
    if (location) {
      console.log('리다이렉트된 URL:', location);

      // 데스크탑 URL인 경우 모바일 URL로 변환 (정적 스크래핑을 위해)
      if (location.includes('map.naver.com/p/entry/place/')) {
        const placeIdMatch = location.match(/place\/(\d+)/);
        if (placeIdMatch) {
          const placeId = placeIdMatch[1];
          const mobileUrl = `https://m.place.naver.com/place/${placeId}/review/visitor?entry=ple`;
          console.log('모바일 URL로 변환:', mobileUrl);
          return mobileUrl;
        }
      }

      return location;
    }

    return url;
  } catch (error) {
    console.error('URL 리다이렉트 처리 오류:', error);
    return url;
  }
}

/**
 * 네이버 플레이스 페이지에서 데이터 추출 (naver.me 단축 URL 지원)
 */
export async function scrapePlaceData(
  shortUrl: string,
): Promise<ScrapedPlaceData | null> {
  try {
    // 단축 URL을 실제 URL로 변환
    const resolvedUrl = await resolveShortUrl(shortUrl);
    console.log(`URL 변환: ${shortUrl} -> ${resolvedUrl}`);

    const response = await fetch(resolvedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://m.naver.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // HTML에서 JSON 데이터 추출
    return extractDataFromHtml(html);
  } catch (error) {
    console.error("네이버 플레이스 데이터 스크래핑 오류:", error);
    return null;
  }
}

/**
 * HTML에서 JSON 데이터 추출
 */
function extractDataFromHtml(html: string): ScrapedPlaceData | null {
  try {
    // Apollo State 패턴으로 먼저 찾기
    const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]*?});/);
    let jsonData = null;

    if (apolloMatch) {
      try {
        // 중괄호 매칭을 정확하게 처리
        const jsonStr = apolloMatch[1];
        jsonData = JSON.parse(jsonStr);
        console.log('Apollo State 데이터 추출 성공:', Object.keys(jsonData));
      } catch (error) {
        console.error('Apollo State 파싱 오류:', error);
      }
    }

    // fallback 패턴들
    if (!jsonData) {
      const patterns = [
        /window\.__PLACE_STATE__\s*=\s*({[\s\S]*?});/,
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
        /__NEXT_DATA__\s*=\s*({[\s\S]*?});/,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            jsonData = JSON.parse(match[1]);
            if (jsonData) break;
          } catch {
            // 파싱 실패시 다음 패턴으로
          }
        }
      }
    }

    // Script 태그 내에서 JSON 데이터 찾기
    if (!jsonData) {
      const scriptTags = html.match(/<script[^>]*>([^<]+)<\/script>/g) || [];
      
      for (const scriptTag of scriptTags) {
        // 다양한 JSON 패턴 시도
        const jsonPatterns = [
          /({[^{}]*"siteId"[^{}]*"[^"]*"[^{}]*})/g,
          /({[^{}]*siteId[^{}]*})/g,
          /("siteId"[^,}]+[,}])/g,
        ];

        for (const jsonPattern of jsonPatterns) {
          const matches = scriptTag.match(jsonPattern);
          if (matches) {
            for (const match of matches) {
              try {
                const parsed = JSON.parse(match);
                if (parsed && (parsed.siteId || parsed.name || parsed.displayName)) {
                  jsonData = parsed;
                  break;
                }
              } catch {
                continue;
              }
            }
            if (jsonData) break;
          }
        }
        if (jsonData) break;
      }
    }

    if (jsonData) {
      const result = parseJsonData(jsonData);
      if (result && (result.siteId || result.title)) {
        return result;
      }
    }

    // JSON 데이터를 찾을 수 없으면 HTML 파싱으로 기본 정보 추출
    return parseHtmlData(html);
  } catch (error) {
    console.error("HTML 데이터 추출 오류:", error);
    return parseHtmlData(html);
  }
}

/**
 * JSON 데이터에서 필요한 정보 추출
 */
function parseJsonData(jsonData: Record<string, unknown>): ScrapedPlaceData | null {
  try {
    const apolloKeys = Object.keys(jsonData);
    let placeDetail: Record<string, unknown> | null = null;
    const reviews: ReviewData[] = [];

    // Apollo State에서 PlaceDetailBase와 VisitorReview 찾기
    for (const key of apolloKeys) {
      // PlaceDetailBase:숫자 패턴 찾기
      if (key.startsWith("PlaceDetailBase:")) {
        const detail = jsonData[key] as Record<string, unknown>;
        if (detail && detail.__typename === "PlaceDetailBase") {
          placeDetail = detail;
        }
      }

      // VisitorReview:문자열 패턴 찾기 (최대 10개까지만)
      if (key.startsWith("VisitorReview:") && reviews.length < 10) {
        const review = jsonData[key] as Record<string, unknown>;
        if (review && review.__typename === "VisitorReview") {
          const reviewData = extractVisitorReviewData(review);
          if (reviewData) {
            reviews.push(reviewData);
          }
        }
      }
    }

    if (placeDetail) {
      const result = extractPlaceInfo(placeDetail);
      if (reviews.length > 0) {
        // 중복 리뷰 제거 (ID 기준)
        const uniqueReviews = reviews.filter((review, index, arr) =>
          arr.findIndex(r => r.id === review.id) === index
        );
        result.reviews = uniqueReviews;
      }
      // Apollo 참조 객체 정리
      return cleanApolloReferences(result) as ScrapedPlaceData;
    }

    // ROOT_QUERY에서 데이터 찾기 (fallback)
    if (jsonData.ROOT_QUERY) {
      const rootQuery = jsonData.ROOT_QUERY as Record<string, unknown>;

      // 플레이스 기본 정보 찾기
      const placeKeys = Object.keys(rootQuery).filter(
        (key) => key.includes("getPlace") || key.includes("place"),
      );

      for (const key of placeKeys) {
        const placeData = rootQuery[key];
        if (placeData && typeof placeData === "object") {
          const result = extractPlaceInfo(placeData as Record<string, unknown>);
          if (reviews.length > 0) {
            // 중복 리뷰 제거 (ID 기준)
            const uniqueReviews = reviews.filter((review, index, arr) =>
              arr.findIndex(r => r.id === review.id) === index
            );
            result.reviews = uniqueReviews;
          }
          // Apollo 참조 객체 정리
          return cleanApolloReferences(result) as ScrapedPlaceData;
        }
      }
    }

    // 직접 플레이스 데이터가 있는 경우
    if (jsonData.siteId) {
      const result = extractPlaceInfo(jsonData);
      if (reviews.length > 0) {
        // 중복 리뷰 제거 (ID 기준)
        const uniqueReviews = reviews.filter((review, index, arr) =>
          arr.findIndex(r => r.id === review.id) === index
        );
        result.reviews = uniqueReviews;
      }
      // Apollo 참조 객체 정리
      return cleanApolloReferences(result) as ScrapedPlaceData;
    }

    return null;
  } catch (error) {
    console.error("JSON 데이터 파싱 오류:", error);
    return null;
  }
}

/**
 * Apollo 참조 객체 제거 및 원시 값 추출
 */
function cleanApolloReferences(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(cleanApolloReferences).filter(Boolean);
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Apollo 참조 객체인 경우 제거
    if (obj.__ref || obj.__typename) {
      return null;
    }

    // 객체의 각 프로퍼티 재귀적으로 정리
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanApolloReferences(value);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }

  return data;
}

/**
 * 플레이스 정보 추출
 */
function extractPlaceInfo(placeData: Record<string, unknown>): ScrapedPlaceData {
  const result: ScrapedPlaceData = {
    siteId: (placeData.siteId as string) || "",
    road: (placeData.road as string) || "",
    category: (placeData.category as string) || "",
    categoryCode: (placeData.categoryCode as string) || "",
    categoryCodeList: (placeData.categoryCodeList as string[]) || [],
    categoryCount: (placeData.categoryCount as number) || 0,
    rcode: (placeData.rcode as string) || "",
    roadAddress: (placeData.roadAddress as string) || "",
    address: (placeData.address as string) || "",
  };

  // Apollo State에서 name 값을 title로 사용
  const name = placeData.name as string;
  const displayName = placeData.displayName as string;
  if (name) {
    result.title = name;
  } else if (displayName) {
    result.title = displayName;
  }

  // roadAddress 값 우선 사용
  const roadAddress = placeData.roadAddress as string;
  if (roadAddress) {
    result.roadAddress = roadAddress;
  }

  // category 값 사용
  const category = placeData.category as string;
  if (category) {
    result.category = category;
  }

  // 기타 정보들
  const description = placeData.description as string;
  if (description) {
    result.description = description;
  }

  const phone = placeData.phone as string;
  if (phone) {
    result.phone = phone;
  }

  const virtualPhone = placeData.virtualPhone as string;
  if (virtualPhone) {
    result.virtualPhone = virtualPhone;
  }

  const rating = placeData.rating as number;
  const totalScore = placeData.totalScore as number;
  if (rating || totalScore) {
    result.rating = rating || totalScore;
  }

  const reviewCount = placeData.reviewCount as number;
  if (reviewCount) {
    result.reviewCount = reviewCount;
  }

  // 이미지 추출
  const images = placeData.images;
  if (images && Array.isArray(images)) {
    result.images = images.map((img: Record<string, unknown> | string) => {
      if (typeof img === 'string') {
        return img;
      }
      return (img.url as string) || '';
    });
  }

  // Street Panorama 정보
  const streetPanorama = placeData.streetPanorama as { _ref?: string };
  if (streetPanorama) {
    result.streetPanorama = streetPanorama;
  }

  return result;
}

/**
 * 텍스트가 유효한 리뷰 내용인지 확인 (이모지만 있거나 빈 내용 제외)
 */
function isValidReviewContent(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return false;
  }

  // 이모지만 있는지 확인 (한글, 영문, 숫자가 포함되어야 유효)
  const hasText = /[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]/.test(content);
  return hasText;
}

/**
 * VisitorReview 데이터에서 리뷰 정보 추출
 */
function extractVisitorReviewData(reviewData: Record<string, unknown>): ReviewData | null {
  try {
    const result: ReviewData = {};

    // VisitorReview 구조에 맞는 필드들 추출
    const id = reviewData.id as string;
    if (id) {
      result.id = id;
    }

    // 작성자 정보
    const author = (reviewData.authorName || reviewData.name || reviewData.author) as string;
    if (author) {
      result.author = author;
    }

    // 평점 정보
    const rating = (reviewData.rating || reviewData.score || reviewData.rank) as number;
    if (rating) {
      result.rating = rating;
    }

    // 리뷰 내용 (body 필드에서 추출)
    const content = (reviewData.body || reviewData.text || reviewData.content || reviewData.contents) as string;
    if (content) {
      result.content = content;
    }

    // 작성 날짜
    const date = (reviewData.date || reviewData.createdString) as string;
    if (date) {
      result.date = date;
    }

    // 이미지 URL들
    const images = reviewData.images as Array<Record<string, unknown>>;
    if (images && Array.isArray(images)) {
      result.imageUrls = images.map((img) => (img.url as string) || '').filter(Boolean);
    }

    // 사장님 답글 여부
    const isOwner = (reviewData.isOfficial || reviewData.isOwner) as boolean;
    if (typeof isOwner === 'boolean') {
      result.isOwner = isOwner;
    }

    // 좋아요 수
    const likeCount = reviewData.likeCount as number;
    if (typeof likeCount === 'number') {
      result.likeCount = likeCount;
    }

    console.log('VisitorReview 필드들:', Object.keys(reviewData));

    // 유효한 리뷰 내용이 있어야만 반환
    if (result.content && isValidReviewContent(result.content)) {
      return result;
    }

    return null;
  } catch (error) {
    console.error("VisitorReview 데이터 추출 오류:", error);
    return null;
  }
}

/**
 * HTML에서 기본 정보 추출 (fallback)
 */
function parseHtmlData(html: string): ScrapedPlaceData | null {
  try {
    const result: ScrapedPlaceData = {
      siteId: "",
      road: "",
      category: "",
      categoryCode: "",
      categoryCodeList: [],
      categoryCount: 0,
      rcode: "",
      roadAddress: "",
      address: "",
    };

    // 제목 추출 - 다양한 패턴으로 시도
    const titlePatterns = [
      /<title[^>]*>([^<]+)</i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.title = match[1]
          .replace(/\s*-\s*네이버.*$/, "")
          .replace(/\s*\|\s*네이버.*$/, "")
          .trim();
        if (result.title) break;
      }
    }

    // 메타 태그에서 정보 추출
    const descMatch = html.match(
      /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
    );
    if (descMatch) {
      result.description = descMatch[1];
    }

    // OpenGraph 메타 태그에서 추가 정보
    const ogDescMatch = html.match(
      /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i,
    );
    if (ogDescMatch && !result.description) {
      result.description = ogDescMatch[1];
    }

    // 주소 정보 추출 시도
    const addressPatterns = [
      /주소[^>]*>([^<]+)</i,
      /address[^>]*>([^<]+)</i,
      /"address"\s*:\s*"([^"]+)"/i,
    ];

    for (const pattern of addressPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.address = match[1].trim();
        break;
      }
    }

    // 전화번호 추출
    const phonePatterns = [
      /전화[^>]*>([^<]+)</i,
      /tel[^>]*>([^<]+)</i,
      /"phone"\s*:\s*"([^"]+)"/i,
      /(\d{2,3}-\d{3,4}-\d{4})/,
    ];

    for (const pattern of phonePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.phone = match[1].trim();
        break;
      }
    }

    // Place ID를 URL에서 추출 (fallback)
    const placeIdMatch = html.match(/restaurant\/(\d+)/);
    if (placeIdMatch) {
      result.siteId = placeIdMatch[1];
    }

    // 최소한 제목이나 siteId가 있어야 유효한 결과로 간주
    return result.title || result.siteId ? result : null;
  } catch (error) {
    console.error("HTML 파싱 오류:", error);
    return null;
  }
}
