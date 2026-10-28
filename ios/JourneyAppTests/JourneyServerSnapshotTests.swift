import XCTest
@testable import JourneyApp

final class JourneyServerSnapshotTests: XCTestCase {
    private func fixture(rate: Double = 92, running: Bool = true, event: String = "") throws -> JourneyServerSnapshot {
        let value: [String: Any] = ["version": 1, "journeyID": "10000000-0000-4000-8000-000000000001", "booked": true,
            "revision": 3, "mode": "accelerated", "elapsedSeconds": 2700, "running": running, "event": event,
            "rate": rate, "serverNow": "2026-10-28T00:00:00+00:00",
            "preferences": ["recoveryPriority": "earliest", "recoveryText": "Arrive early"]]
        return try JSONDecoder().decode(JourneyServerSnapshot.self, from: JSONSerialization.data(withJSONObject: value))
    }
    func testSnapshotProjectsFromMonotonicReceiptTime() throws {
        let value = try fixture(); try value.validate()
        let received = Date(timeIntervalSinceReferenceDate: 1000)
        let presentation = value.presentation(at: received)
        XCTAssertEqual(presentation.progress(at: received.addingTimeInterval(10)), 3620)
        XCTAssertEqual(presentation.phase(at: received), .airport)
        XCTAssertEqual(presentation.revision, 3)
    }
    func testRejectsInconsistentClockAndDisruption() throws {
        XCTAssertThrowsError(try fixture(rate: 1).validate())
        XCTAssertThrowsError(try fixture(event: "cancelled").validate())
        XCTAssertNoThrow(try fixture(rate: 0, running: false, event: "cancelled").validate())
    }
    func testNativePayloadContainsNoCredentials() throws {
        let value = try fixture();let received = Date(timeIntervalSinceReferenceDate: 1000)
        let payload = value.presentation(at: received).payload(at: received)
        XCTAssertNil(payload["access_token"]);XCTAssertNil(payload["refresh_token"])
        XCTAssertEqual(payload["journeyID"] as? String, value.journeyID.uuidString)
    }
    func testPendingCommandKeepsIdentityAndRevisionWhenPersisted() throws {
        let value = JourneyPendingCommand(journeyID: UUID(), commandID: UUID(), expectedVersion: 7, kind: "inject", arguments: ["event":"cancelled"])
        let restored = try JSONDecoder().decode(JourneyPendingCommand.self, from: JSONEncoder().encode(value))
        XCTAssertEqual(restored.commandID, value.commandID)
        XCTAssertEqual(restored.body["p_expected_version"] as? Int, 7)
        XCTAssertEqual(restored.arguments["event"], "cancelled")
    }
}
