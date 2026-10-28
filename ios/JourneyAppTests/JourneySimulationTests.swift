import XCTest
@testable import JourneyApp

final class JourneySimulationTests: XCTestCase {
    let start = Date(timeIntervalSince1970: 1_800_000_000)
    func testAcceleratedPlaybackFinishesInTenMinutes() {
        var s = JourneySimulation(); s.start(at: start); s.setMode(.accelerated, at: start); s.toggle(at: start)
        XCTAssertEqual(s.phase(at: start.addingTimeInterval(600)), .arrived)
        XCTAssertEqual(s.progress(at: start.addingTimeInterval(900)), JourneySimulation.duration)
    }
    func testPauseResumeAndBackgroundCatchUp() {
        var s = JourneySimulation(); s.start(at: start); s.setMode(.realtime, at: start); s.toggle(at: start)
        let data = try! JSONEncoder().encode(s)
        var restored = JourneySimulation.restore(data, now: start.addingTimeInterval(3600))
        XCTAssertEqual(restored.phase(at: start.addingTimeInterval(3600)), .airport)
        restored.toggle(at: start.addingTimeInterval(3600))
        XCTAssertEqual(restored.progress(at: start.addingTimeInterval(7200)), 3600)
    }
    func testEventPausesPlaybackAndJumpClearsIt() {
        var s = JourneySimulation(); s.start(at: start); s.setMode(.accelerated, at: start); s.toggle(at: start)
        s.inject(.cancelled, at: start.addingTimeInterval(10))
        XCTAssertFalse(s.running); XCTAssertEqual(s.event, .cancelled)
        s.jump(.boarding, at: start.addingTimeInterval(20))
        XCTAssertNil(s.event); XCTAssertEqual(s.phase(at: start.addingTimeInterval(20)), .boarding)
        s.jump(.inflight, at: start); s.inject(.cancelled, at: start)
        XCTAssertNil(s.event)
    }
    func testGuidedModeDoesNotAdvanceAndClockRollbackDoesNotReverse() {
        var s = JourneySimulation(); s.start(at: start); s.jump(.airport, at: start)
        XCTAssertEqual(s.progress(at: start.addingTimeInterval(86400)), 2700)
        s.setMode(.realtime, at: start); s.toggle(at: start)
        XCTAssertEqual(s.progress(at: start.addingTimeInterval(-100)), 2700)
    }
}
