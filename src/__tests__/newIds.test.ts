import { describe, expect, spyOn, test } from "bun:test";
import { newIds } from "../newIds";
import * as retryModule from "../utils/retry";
import * as utilsModule from "../utils/utils";

// Mock data
const mockHtml = `
<html>
<body>
  <table></table>
  <table></table>
  <table>
    <tr>
      <td>
        <table>
          <tr><td><a href="http://ling.auf.net/lingbuzz/123456">Link 1</a></td></tr>
          <tr><td><a href="http://ling.auf.net/lingbuzz/123456">Link 1 Dup</a></td></tr>
          <tr><td><a href="http://ling.auf.net/lingbuzz/654321">Link 2</a></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

describe("newIds", () => {
	test("should return deduplicated IDs", async () => {
		// Mock fetchWithRetry to return our HTML
		const fetchSpy = spyOn(retryModule, "fetchWithRetry").mockResolvedValue(
			new Response(mockHtml),
		);

		// Mock loadPapers to return a dummy paper so newIds logic proceeds
		const loadPapersSpy = spyOn(utilsModule, "loadPapers").mockResolvedValue([
			{ id: "000000", title: "Dummy", authors: {}, pdfLink: "", paperURL: "" },
		]);

		const ids = await newIds();

		// The order depends on the implementation, but we expect 123456 and 654321
		// Since Set preserves insertion order, and filter does too:
		// 123456 appears first, then 654321.
		expect(ids).toEqual([123456, 654321]);
		expect(ids.length).toBe(2);

		fetchSpy.mockRestore();
		loadPapersSpy.mockRestore();
	});
});
