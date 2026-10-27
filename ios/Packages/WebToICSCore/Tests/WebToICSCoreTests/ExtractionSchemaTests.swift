import XCTest
@testable import WebToICSCore

final class ExtractionSchemaTests: XCTestCase {
    func testResponseSchemaShape() throws {
        let schema = ExtractionSchema.responseSchema()
        XCTAssertEqual(schema["type"] as? String, "object")
        XCTAssertEqual(schema["additionalProperties"] as? Bool, false)
        XCTAssertEqual(schema["required"] as? [String], ["success", "errorMessage", "eventData", "emailSubject", "locationLookup"])
        let props = try XCTUnwrap(schema["properties"] as? [String: Any])
        let eventData = try XCTUnwrap(props["eventData"] as? [String: Any])
        XCTAssertEqual(eventData["type"] as? String, "array")
        XCTAssertEqual(eventData["minItems"] as? Int, 1)
        XCTAssertEqual(eventData["maxItems"] as? Int, 10)
        let items = try XCTUnwrap(eventData["items"] as? [String: Any])
        XCTAssertEqual(items["required"] as? [String], ExtractionSchema.eventFieldOrder)
        XCTAssertEqual(items["additionalProperties"] as? Bool, false)
        let itemProps = try XCTUnwrap(items["properties"] as? [String: Any])
        XCTAssertEqual(Set(itemProps.keys), Set(ExtractionSchema.eventFieldOrder))
        XCTAssertEqual((itemProps["isAllDay"] as? [String: Any])?["type"] as? String, "boolean")
    }

    func testResponseFormatWrapsSchemaStrictly() throws {
        let format = ExtractionSchema.responseFormat()
        XCTAssertEqual(format["type"] as? String, "json_schema")
        let inner = try XCTUnwrap(format["json_schema"] as? [String: Any])
        XCTAssertEqual(inner["name"] as? String, "calendar_event")
        XCTAssertEqual(inner["strict"] as? Bool, true)
        XCTAssertNotNil(inner["schema"])
        XCTAssertNoThrow(try ExtractionSchema.responseSchemaJSON())
    }
}
