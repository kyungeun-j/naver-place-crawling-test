"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    placeId: string;
    originalUrl: string;
    mobileUrl: string;
    placeData: {
      title?: string;
      category?: string;
      address?: string;
      roadAddress?: string;
      phone?: string;
      virtualPhone?: number;
      rating?: number;
      reviewCount?: number;
      reviews?: Array<{
        id?: string;
        author?: string;
        rating?: number;
        content?: string;
        date?: string;
        imageUrls?: string[];
        isOwner?: boolean;
        likeCount?: number;
      }>;
      [key: string]: unknown;
    };
  } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/place", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "오류가 발생했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 font-sans">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          네이버 플레이스 데이터 추출기
        </h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-4">
            <label htmlFor="url" className="font-medium">
              네이버 지도 또는 플레이스 URL을 입력하세요:
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://naver.me/ABCD"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "데이터 추출 중..." : "데이터 추출"}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">오류</p>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-green-800">
              추출된 데이터
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">기본 정보</h3>
                <div className="bg-white p-4 rounded border mt-2">
                  <p>
                    <strong>URL:</strong>
                    <a
                      href={result.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2"
                    >
                      {result.originalUrl.length > 60
                        ? `${result.originalUrl.substring(0, 60)}...`
                        : result.originalUrl}
                    </a>
                  </p>
                </div>
              </div>

              {result.placeData.title && (
                <div>
                  <h3 className="font-semibold text-gray-700">매장게 정보</h3>
                  <div className="bg-white p-4 rounded border mt-2 space-y-2">
                    {result.placeData.title && (
                      <p>
                        <strong>매장명:</strong> {result.placeData.title}
                      </p>
                    )}
                    {result.placeData.address && (
                      <p>
                        <strong>주소:</strong> {result.placeData.address}
                      </p>
                    )}
                    {result.placeData.roadAddress && (
                      <p>
                        <strong>도로명 주소:</strong>{" "}
                        {result.placeData.roadAddress}
                      </p>
                    )}
                    {result.placeData.phone && (
                      <p>
                        <strong>연락처:</strong> {result.placeData.phone}
                      </p>
                    )}

                    {result.placeData.virtualPhone && (
                      <p>
                        <strong>가상 연락처:</strong> {result.placeData.virtualPhone}
                      </p>
                    )}
                    {result.placeData.category && (
                      <p>
                        <strong>업종:</strong> {result.placeData.category}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.placeData.reviews && result.placeData.reviews.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-gray-700">방문자 리뷰 데이터</h3>
                  <div className="bg-white border border-gray-200 rounded-lg mt-2 p-4 max-h-80 overflow-y-auto">
                    {result.placeData.reviews.map((review, index) => (
                      <div key={review.id || index} className="border-b border-gray-100 pb-4 mb-4 last:border-b-0 last:mb-0">
                        {review.content && (
                          <p className="text-sm text-gray-700 mb-2">{review.content}</p>
                        )}
                        {review.imageUrls && review.imageUrls.length > 0 && (
                          <div className="flex space-x-2 mt-2">
                            {review.imageUrls.slice(0, 3).map((url, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={url}
                                alt={`리뷰 이미지 ${imgIndex + 1}`}
                                className="w-16 h-16 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ))}
                            {review.imageUrls.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                                +{review.imageUrls.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-gray-700">방문자 리뷰 데이터가 없습니다.</h3>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
