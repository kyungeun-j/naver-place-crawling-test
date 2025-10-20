export interface NaverPlaceData {
	siteId: string;
	category: string;
	roadAddress: string;
	title?: string;
	phone?: string;
	virtualPhone?: string;
	reviews?: {
		id?: string;
		content: string;
	}[];
}
