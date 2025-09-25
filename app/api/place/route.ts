import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidNaverUrl } from "@/lib/place-utils";
import { scrapePlaceData } from "@/lib/place-scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
    }

    // naver.me 단축 URL 유효성 검사
    if (!isValidNaverUrl(url)) {
      return NextResponse.json(
        { error: "유효한 naver.me 단축 URL이 아닙니다." },
        { status: 400 },
      );
    }

    // naver.me 단축 URL로 직접 데이터 스크래핑
    const placeData = await scrapePlaceData(url);
    if (!placeData) {
      return NextResponse.json(
        { error: "플레이스 데이터를 가져올 수 없습니다." },
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    // naver.me 단축 URL 유효성 검사
    if (!isValidNaverUrl(url)) {
      return NextResponse.json(
        { error: "유효한 naver.me 단축 URL이 아닙니다." },
        { status: 400 },
      );
    }

    // naver.me 단축 URL로 직접 데이터 스크래핑
    const placeData = await scrapePlaceData(url);
    if (!placeData) {
      return NextResponse.json(
        { error: "플레이스 데이터를 가져올 수 없습니다." },
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
