import XCTest
@testable import WebToICSCore

final class PromptBuilderTests: XCTestCase {
    let context = PromptContext(now: Fixtures.date("2026-05-01T12:00:00Z"),
                                calendarTimeZone: TimeZone(identifier: "America/Los_Angeles")!,
                                defaultTimeZoneID: "America/Los_Angeles", tentative: true)

    func testRenderSubstitutesEveryPlaceholder() {
        let template = "T={{TODAY}} Y={{YEAR}} N={{NEXT_YEAR}} Z={{DEFAULT_TZ}} F={{TENTATIVE}}\n{{POLICY}}\n{{CUSTOM_PROMPT}}"
        let out = PromptBuilder.render(template: template, policy: "<policy/>", customPrompt: "- pref", context: context)
        XCTAssertEqual(out, "T=2026-05-01 (Friday) Y=2026 N=2027 Z=America/Los_Angeles F=1 (tentative)\n<policy/>\n- pref")
        XCTAssertFalse(out.contains("{{"))
    }

    func testBundledSystemPromptIncludesPolicyAndCustomPrompt() throws {
        let prompt = try PromptBuilder.systemPrompt(context: context)
        XCTAssertTrue(prompt.contains("prompt-policy id=\"email-to-ics-event-selection\""))
        XCTAssertTrue(prompt.contains("equal-performance-rule"))
        XCTAssertTrue(prompt.contains("Never use a ticketing/platform brand"))
        XCTAssertTrue(prompt.contains("Today's date: 2026-05-01 (Friday)"))
        XCTAssertTrue(prompt.contains("Always return eventData as an ARRAY"))
        XCTAssertTrue(prompt.contains("Opera: 3 hours"))
        XCTAssertFalse(prompt.contains("{{"))
        XCTAssertFalse(prompt.contains("VCALENDAR"))
    }

    func testCustomPromptOverride() throws {
        let prompt = try PromptBuilder.systemPrompt(context: context, customPrompt: "- Always title events in ALL CAPS")
        XCTAssertTrue(prompt.contains("- Always title events in ALL CAPS"))
        XCTAssertFalse(prompt.contains("Never use a ticketing/platform brand"))
    }

    func testInstructionsAndSourceMessages() {
        XCTAssertNil(PromptBuilder.instructionsMessage(nil))
        XCTAssertNil(PromptBuilder.instructionsMessage("  \n"))
        XCTAssertEqual(PromptBuilder.instructionsMessage(" Only May 30 "),
                       "*** EXTREMELY IMPORTANT INSTRUCTIONS ***\nOnly May 30")
        XCTAssertNil(PromptBuilder.sourceMessage(url: nil, title: nil, siteName: nil))
        let source = PromptBuilder.sourceMessage(url: "https://example.com/e?utm_source=x&id=5", title: "Show", siteName: "Venue")!
        XCTAssertTrue(source.hasPrefix("*** SOURCE URL ***\nThe content was fetched from: https://example.com/e?id=5\n"))
        XCTAssertTrue(source.contains("Page title: Show"))
        XCTAssertTrue(source.contains("Site name: Venue"))
        XCTAssertTrue(source.contains("'url' field"))
        XCTAssertEqual(PromptBuilder.contentMessage(text: "hi", isRawHTML: false), "Content to analyze:\nhi")
        XCTAssertTrue(PromptBuilder.contentMessage(text: "<p>", isRawHTML: true).contains("raw page HTML"))
    }
}
