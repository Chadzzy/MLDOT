import Foundation

// Replay uses the existing demonstration itinerary so all recovery fixtures agree.
// The backend will eventually own this clock; iOS timers are never a background monitor.
struct JourneySimulation: Codable, Equatable {
    enum Mode: String, Codable, CaseIterable { case guided, accelerated, realtime }
    enum Phase: String, Codable, CaseIterable {
        case pretravel, airport, boarding, inflight, arrived
        var title: String {
            switch self {
            case .pretravel: return "Before departure"
            case .airport: return "At Hong Kong airport"
            case .boarding: return "Boarding"
            case .inflight: return "In flight"
            case .arrived: return "Arrived in Zurich"
            }
        }
        var minute: Double {
            switch self {
            case .pretravel: return 0
            case .airport: return 45
            case .boarding: return 95
            case .inflight: return 135
            case .arrived: return 920
            }
        }
    }
    enum Event: String, Codable, CaseIterable { case gate, delay, cancelled }
    static let duration: Double = 920 * 60
    static let flightStart = ISO8601DateFormatter().date(from: "2026-10-27T14:10:00Z")!
    var id = UUID()
    var booked = false
    var mode: Mode = .guided
    var elapsed: Double = 0
    var anchor = Date()
    var running = false
    var event: Event?
    var revision = 0

    var speed: Double { mode == .accelerated ? Self.duration / 600 : mode == .realtime ? 1 : 0 }
    func progress(at now: Date) -> Double {
        min(Self.duration, max(0, elapsed + (running ? max(0, now.timeIntervalSince(anchor)) * speed : 0)))
    }
    func phase(at now: Date) -> Phase {
        Phase.allCases.last(where: { progress(at: now) >= $0.minute * 60 }) ?? .pretravel
    }
    mutating func settle(at now: Date) { elapsed = progress(at: now); anchor = now; revision += 1 }
    mutating func setMode(_ value: Mode, at now: Date) { settle(at: now); mode = value; if value == .guided { running = false } }
    mutating func toggle(at now: Date) { settle(at: now); running = booked && mode != .guided && elapsed < Self.duration && !running }
    mutating func jump(_ phase: Phase, at now: Date) { elapsed = phase.minute * 60; anchor = now; running = false; event = nil; revision += 1 }
    mutating func inject(_ value: Event?, at now: Date) {
        guard booked, phase(at: now) != .inflight, phase(at: now) != .arrived else { return }
        settle(at: now); event = value; running = false
    }
    mutating func start(at now: Date) { self = JourneySimulation(); booked = true; anchor = now }
    func payload(at now: Date) -> [String: Any] {
        ["version": 1, "journeyID": id.uuidString, "booked": booked,
         "phase": phase(at: now).rawValue, "event": event?.rawValue ?? "",
         "clock": ISO8601DateFormatter().string(from: Self.flightStart.addingTimeInterval(progress(at: now))),
         "revision": revision]
    }
    static func restore(_ data: Data?, now: Date = Date()) -> Self {
        guard let data, var value = try? JSONDecoder().decode(Self.self, from: data),
              value.elapsed.isFinite, value.elapsed >= 0, value.elapsed <= duration,
              value.anchor.timeIntervalSince1970.isFinite else { return Self() }
        if !value.booked { value.running = false; value.event = nil }
        if value.mode == .guided { value.running = false }
        // A device clock moving backwards must not move the simulated journey backwards.
        if value.anchor > now { value.anchor = now }
        return value
    }
}
