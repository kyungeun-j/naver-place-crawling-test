"use client";

import { useId, useState } from "react";

export default function Home() {
	const urlInputId = useId();
	const [url, setUrl] = useState("");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<{
		originalUrl: string;
		placeData: import("@/types").NaverPlaceData;
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
			<main className="mx-auto max-w-4xl">
				<h1 className="mb-8 text-center font-bold text-3xl">
					네이버 플레이스 데이터 추출기
				</h1>

				<form onSubmit={handleSubmit} className="mb-8">
					<div className="flex flex-col gap-4">
						<label htmlFor={urlInputId} className="font-medium">
							네이버 지도 또는 플레이스 URL을 입력하세요:
						</label>
						<input
							id={urlInputId}
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="네이버 플레이스 URL을 입력하세요"
							className="w-full rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
							disabled={loading}
						/>
						<button
							type="submit"
							disabled={loading || !url.trim()}
							className="rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
						>
							{loading ? "데이터 추출 중..." : "데이터 추출"}
						</button>
					</div>
				</form>

				{error && (
					<div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
						<p className="font-medium">오류</p>
						<p>{error}</p>
					</div>
				)}

				{result && (
					<div className="rounded-lg border border-green-200 bg-green-50 p-6">
						<h2 className="mb-4 font-bold text-green-800 text-xl">
							추출된 데이터
						</h2>

						<div className="space-y-4">
							<div>
								<h3 className="font-semibold text-gray-700">기본 정보</h3>
								<div className="mt-2 rounded border bg-white p-4">
									<p>
										<strong>URL:</strong>
										<a
											href={result.originalUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="ml-2 text-blue-600 hover:underline"
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
									<div className="mt-2 space-y-2 rounded border bg-white p-4">
										{result.placeData.title && (
											<p>
												<strong>매장명:</strong> {result.placeData.title}
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
												<strong>가상 연락처:</strong>{" "}
												{result.placeData.virtualPhone}
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

							{result.placeData.reviews &&
							result.placeData.reviews.length > 0 ? (
								<div>
									<h3 className="font-semibold text-gray-700">
										방문자 리뷰 데이터
									</h3>
									<div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
										{result.placeData.reviews.map((review, index) => (
											<div
												key={review.id || index}
												className="mb-4 border-gray-100 border-b pb-4 last:mb-0 last:border-b-0"
											>
												{review.content && (
													<p className="mb-2 text-gray-700 text-sm">
														{review.content}
													</p>
												)}
											</div>
										))}
									</div>
								</div>
							) : (
								<div>
									<h3 className="font-semibold text-gray-700">
										방문자 리뷰 데이터가 없습니다.
									</h3>
								</div>
							)}
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
