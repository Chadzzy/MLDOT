import Foundation

struct BackendFailure: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
    static let storage = BackendFailure(status: 0, message: "Your journey identity could not be saved securely. Please try again.")
    static let invalid = BackendFailure(status: 502, message: "The journey service returned an unexpected response.")
}

struct BackendConfiguration: Decodable {
    let url: URL
    let publishableKey: String
    static func bundled() throws -> Self {
        guard let path = Bundle.main.url(forResource: "supabase", withExtension: "json") else { throw BackendFailure.invalid }
        let value = try JSONDecoder().decode(Self.self, from: Data(contentsOf: path))
        guard value.url.scheme == "https", value.url.host == "mekjqboywhbtbbabxela.supabase.co",
              value.publishableKey.hasPrefix("sb_publishable_") else { throw BackendFailure.invalid }
        return value
    }
}

struct BackendSession: Codable {
    struct User: Codable { let id: UUID }
    let access_token: String
    let refresh_token: String
    let expires_in: Double
    var expires_at: Double?
    let user: User
}

struct JourneyServerSnapshot: Codable {
    struct Preferences: Codable { let recoveryPriority: String; let recoveryText: String }
    let version: Int
    let journeyID: UUID
    let booked: Bool
    let revision: Int
    let mode: JourneySimulation.Mode
    let elapsedSeconds: Double
    let running: Bool
    let event: String
    let rate: Double
    let serverNow: String
    let preferences: Preferences
    func validate() throws {
        guard version == 1, booked, revision >= 0, elapsedSeconds.isFinite,
              (0...JourneySimulation.duration).contains(elapsedSeconds),
              ["", "gate", "delay", "cancelled"].contains(event),
              [0.0, 1.0, 92.0].contains(rate),
              (!running || (mode != .guided && event.isEmpty && elapsedSeconds < JourneySimulation.duration)),
              rate == (running ? (mode == .accelerated ? 92 : 1) : 0),
              elapsedSeconds < 8100 || event.isEmpty,
              ["business", "earliest"].contains(preferences.recoveryPriority), preferences.recoveryText.count <= 500 else { throw BackendFailure.invalid }
    }
    func presentation(at monotonicDate: Date) -> JourneySimulation {
        var result = JourneySimulation()
        result.id = journeyID; result.booked = booked; result.revision = revision
        result.mode = mode; result.elapsed = elapsedSeconds; result.anchor = monotonicDate
        result.running = running; result.event = JourneySimulation.Event(rawValue: event)
        return result
    }
}

struct JourneyPendingCommand: Codable {
    let journeyID: UUID
    let commandID: UUID
    let expectedVersion: Int
    let kind: String
    let arguments: [String: String]
    var body: [String: Any] {
        ["p_journey_id": journeyID.uuidString, "p_command_id": commandID.uuidString,
         "p_expected_version": expectedVersion, "p_command": kind, "p_args": arguments]
    }
}

@MainActor final class SupabaseJourneyService {
    private var session: BackendSession?
    private var sessionTask: Task<BackendSession, Error>?
    private let transport: URLSession
    init(transport: URLSession = .shared) { self.transport = transport }

    private func request(_ path: String, body: [String: Any], token: String? = nil) async throws -> Data {
        let config = try BackendConfiguration.bundled()
        guard let url = URL(string: path, relativeTo: config.url)?.absoluteURL,
              url.host == config.url.host else { throw BackendFailure.invalid }
        var request = URLRequest(url: url, timeoutInterval: 15)
        request.httpMethod = "POST"; request.setValue(config.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await transport.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw BackendFailure.invalid }
        guard (200..<300).contains(http.statusCode) else {
            let message: String
            switch http.statusCode {
            case 409: message = "Your journey changed elsewhere. The latest state will be loaded; review it before trying again."
            case 401, 403: message = "Your journey session could not be authenticated. Retry to reconnect."
            case 404: message = "This journey is not available to this device's saved identity."
            case 429: message = "The service is busy. Please wait a moment before retrying."
            default: message = "The journey service could not complete this change. Please retry."
            }
            throw BackendFailure(status: http.statusCode, message: message)
        }
        return data
    }

    private func authenticate() async throws -> BackendSession {
        if session == nil, let data = try JourneyKeychain.read("session") {
            session = try JSONDecoder().decode(BackendSession.self, from: data)
        }
        if let session, (session.expires_at ?? 0) > Date().timeIntervalSince1970 + 60 { return session }
        if let task = sessionTask { return try await task.value }
        let old = session
        let task = Task { () async throws -> BackendSession in
            let data: Data
            if let old {
                // Never silently create a new identity when a saved refresh token fails.
                data = try await request("/auth/v1/token?grant_type=refresh_token", body: ["refresh_token": old.refresh_token])
            } else {
                data = try await request("/auth/v1/signup", body: ["data": ["app": "MLDOT iPhone journey"]])
            }
            var value = try JSONDecoder().decode(BackendSession.self, from: data)
            guard !value.access_token.isEmpty, !value.refresh_token.isEmpty,
                  old == nil || old?.user.id == value.user.id else { throw BackendFailure.invalid }
            if value.expires_at == nil { value.expires_at = Date().timeIntervalSince1970 + value.expires_in }
            try JourneyKeychain.write(JSONEncoder().encode(value), account: "session")
            session = value
            return value
        }
        sessionTask = task
        defer { sessionTask = nil }
        return try await task.value
    }

    private func rpc(_ name: String, body: [String: Any]) async throws -> JourneyServerSnapshot {
        let identity = try await authenticate()
        let data: Data
        do { data = try await request("/rest/v1/rpc/\(name)", body: body, token: identity.access_token) }
        catch let error as BackendFailure where error.status == 401 {
            session?.expires_at = 0
            let refreshed = try await authenticate()
            data = try await request("/rest/v1/rpc/\(name)", body: body, token: refreshed.access_token)
        }
        let value = try JSONDecoder().decode(JourneyServerSnapshot.self, from: data)
        try value.validate()
        return value
    }
    func create(_ id: UUID) async throws -> JourneyServerSnapshot {
        try await rpc("journey_demo_create", body: ["p_journey_id": id.uuidString])
    }
    func snapshot(_ id: UUID) async throws -> JourneyServerSnapshot {
        try await rpc("journey_demo_snapshot", body: ["p_journey_id": id.uuidString])
    }
    func command(_ pending: JourneyPendingCommand) async throws -> JourneyServerSnapshot {
        try await rpc("journey_demo_command", body: pending.body)
    }
}
