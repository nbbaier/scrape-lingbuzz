const BASE_URL = "https://ling.auf.net/lingbuzz";

function generateUrls(baseUrl: string, limit: number): string[] {
	const urls: string[] = [];
	let start = 1;

	while (start <= limit) {
		urls.push(`${baseUrl}/_listing?start=${start}`);

		if (start === 1) {
			start = 31;
		} else {
			start += 100;
		}
	}

	return urls;
}

const urlList = generateUrls(BASE_URL, 8297);
console.log(urlList);
