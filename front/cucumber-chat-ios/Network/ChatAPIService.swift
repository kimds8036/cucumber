import Foundation

struct UploadImagePayload {
    let data: Data
    let fileName: String
    let mimeType: String
}

class ChatAPIService {
    static let shared = ChatAPIService()
    private var baseURL = "http://localhost:3000/api"
    private var authToken: String?

    func setToken(_ token: String) { authToken = token }
    func setBaseURL(_ url: String) { baseURL = url }

    private func makeRequest(path: String, method: String = "GET", body: [String: Any]? = nil) -> URLRequest? {
        guard let url = URL(string: baseURL + path) else { return nil }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = body {
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        return req
    }

    private func fetch<T: Codable>(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
        guard let req = makeRequest(path: path, method: method, body: body) else {
            throw URLError(.badURL)
        }
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func makeMultipartRequest(path: String, fields: [String: String], images: [UploadImagePayload]) -> URLRequest? {
        guard let url = URL(string: baseURL + path) else { return nil }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        if let token = authToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let boundary = "Boundary-\(UUID().uuidString)"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        for (key, value) in fields {
            body.append("--\(boundary)\r\n")
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n")
            body.append("\(value)\r\n")
        }
        for image in images {
            body.append("--\(boundary)\r\n")
            body.append("Content-Disposition: form-data; name=\"images\"; filename=\"\(image.fileName)\"\r\n")
            body.append("Content-Type: \(image.mimeType)\r\n\r\n")
            body.append(image.data)
            body.append("\r\n")
        }
        body.append("--\(boundary)--\r\n")
        req.httpBody = body
        return req
    }

    private func postMultipart<T: Codable>(path: String, fields: [String: String], images: [UploadImagePayload]) async throws -> T {
        guard let req = makeMultipartRequest(path: path, fields: fields, images: images) else {
            throw URLError(.badURL)
        }
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func fetchRoomDetail(path: String) async throws -> MessagesResponse {
        guard let req = makeRequest(path: path) else { throw URLError(.badURL) }
        let (data, _) = try await URLSession.shared.data(for: req)
        let decoder = JSONDecoder()

        // 1) Legacy/native model shape: { messages, has_more }
        if let res = try? decoder.decode(MessagesResponse.self, from: data) {
            return res
        }

        // 2) JS shape used in useChat.js: { data: [...], hasMore: bool, room: {...} }
        struct JSRoomDetailResponse: Codable {
            let data: [ChatMessage]?
            let hasMore: Bool?
            let has_more: Bool?
        }
        if let js = try? decoder.decode(JSRoomDetailResponse.self, from: data) {
            return MessagesResponse(
                messages: js.data ?? [],
                hasMore: js.hasMore ?? js.has_more ?? false
            )
        }

        // 3) Wrapped API shape: { success, data: { ... } } or { success, data: [ ... ] }
        if
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let wrappedData = json["data"]
        {
            if let nested = wrappedData as? [String: Any] {
                if
                    let nestedData = try? JSONSerialization.data(withJSONObject: nested),
                    let nestedMessages = try? decoder.decode(MessagesResponse.self, from: nestedData)
                {
                    return nestedMessages
                }
            } else if let arr = wrappedData as? [[String: Any]] {
                let arrData = try JSONSerialization.data(withJSONObject: arr)
                let msgs = (try? decoder.decode([ChatMessage].self, from: arrData)) ?? []
                let hasMore = (json["hasMore"] as? Bool) ?? (json["has_more"] as? Bool) ?? false
                return MessagesResponse(messages: msgs, hasMore: hasMore)
            }
        }

        throw NSError(domain: "ChatAPIService", code: -1, userInfo: [
            NSLocalizedDescriptionKey: "채팅 상세 응답 파싱 실패"
        ])
    }
}

extension ChatAPIService {
    func fetchMessageRooms() async throws -> [ChatRoom] {
        let res: APIResponse<RoomsResponse> = try await fetch("/messages/rooms?page=1&limit=50")
        return res.data?.rooms ?? []
    }

    func fetchMessageRoomDetail(roomId: Int) async throws -> MessagesResponse {
        try await fetchRoomDetail(path: "/messages/rooms/\(roomId)")
    }

    func fetchNewMessageRoomMessages(roomId: Int, afterMessageId: String, limit: Int = 50) async throws -> [ChatMessage] {
        let res = try await fetchRoomDetail(path: "/messages/rooms/\(roomId)?after=\(afterMessageId)&limit=\(limit)")
        return res.messages
    }

    func fetchMessageRoomForPost(roomId: Int) async throws -> PostRoomResponse {
        try await fetch("/messages/rooms/\(roomId)?limit=1")
    }

    func sendMessage(roomId: Int, content: String, parentMessageId: Int? = nil, images: [UploadImagePayload] = []) async throws {
        if images.isEmpty {
            var body: [String: Any] = ["content": content]
            if let pid = parentMessageId { body["parent_message_id"] = pid }
            let _: APIResponse<ChatMessage> = try await fetch("/messages/rooms/\(roomId)/messages", method: "POST", body: body)
            return
        }
        var fields: [String: String] = ["content": content]
        if let pid = parentMessageId { fields["parent_message_id"] = String(pid) }
        let _: APIResponse<ChatMessage> = try await postMultipart(path: "/messages/rooms/\(roomId)/messages", fields: fields, images: images)
    }

    func markMessageRoomRead(roomId: Int) async throws {
        let _: APIResponse<String> = try await fetch("/messages/rooms/\(roomId)/read", method: "PUT")
    }

    func deleteMessageRoom(roomId: Int) async throws {
        let _: APIResponse<String> = try await fetch("/messages/rooms/\(roomId)", method: "DELETE")
    }

    func deleteMessage(messageId: String) async throws {
        let _: APIResponse<String> = try await fetch("/messages/\(messageId)", method: "DELETE")
    }
}

extension ChatAPIService {
    func fetchDMRooms() async throws -> [ChatRoom] {
        let res: APIResponse<RoomsResponse> = try await fetch("/dm/rooms?page=1&limit=50")
        return res.data?.rooms ?? []
    }

    func fetchDMRoomDetail(roomId: Int) async throws -> MessagesResponse {
        try await fetchRoomDetail(path: "/dm/rooms/\(roomId)")
    }

    func fetchNewDMRoomMessages(roomId: Int, afterMessageId: String, limit: Int = 50) async throws -> [ChatMessage] {
        let res = try await fetchRoomDetail(path: "/dm/rooms/\(roomId)?after=\(afterMessageId)&limit=\(limit)")
        return res.messages
    }

    func sendDMMessage(roomId: Int, content: String, parentMessageId: Int? = nil, images: [UploadImagePayload] = []) async throws {
        if images.isEmpty {
            var body: [String: Any] = ["content": content]
            if let pid = parentMessageId { body["parent_message_id"] = pid }
            let _: APIResponse<ChatMessage> = try await fetch("/dm/rooms/\(roomId)/messages", method: "POST", body: body)
            return
        }
        var fields: [String: String] = ["content": content]
        if let pid = parentMessageId { fields["parent_message_id"] = String(pid) }
        let _: APIResponse<ChatMessage> = try await postMultipart(path: "/dm/rooms/\(roomId)/messages", fields: fields, images: images)
    }

    func markDMRoomRead(roomId: Int) async throws {
        let _: APIResponse<String> = try await fetch("/dm/rooms/\(roomId)/read", method: "PUT")
    }

    func deleteDMRoom(roomId: Int) async throws {
        let _: APIResponse<String> = try await fetch("/dm/rooms/\(roomId)", method: "DELETE")
    }

    func deleteDMMessage(messageId: String) async throws {
        let _: APIResponse<String> = try await fetch("/dm/messages/\(messageId)", method: "DELETE")
    }
}

extension ChatAPIService {
    func fetchReceivedMails() async throws -> [PersonalMail] {
        let res: APIResponse<[PersonalMail]> = try await fetch("/mails/personal/received?page=1&limit=50")
        return res.data ?? []
    }

    func fetchSentMails() async throws -> [PersonalMail] {
        let res: APIResponse<[PersonalMail]> = try await fetch("/mails/personal/sent?page=1&limit=50")
        return res.data ?? []
    }

    func deleteMailRoom(roomId: Int) async throws {
        let _: APIResponse<String> = try await fetch("/mails/personal/rooms/\(roomId)", method: "DELETE")
    }
}

extension ChatAPIService {
    func fetchPostDetail(postId: Int) async throws -> PostDetailResponse {
        try await fetch("/posts/\(postId)")
    }
}

private extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
