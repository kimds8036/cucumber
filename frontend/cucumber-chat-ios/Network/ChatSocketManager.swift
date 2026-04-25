import Foundation
#if canImport(SocketIO)
import SocketIO
#endif

enum SocketEvent {
    static let joinRoom = "join_room"
    static let leaveRoom = "leave_room"
    static let typingStart = "typing_start"
    static let typingStop = "typing_stop"
    static let newMessage = "new_message"
    static let readReceipt = "read_receipt"
    static let userTyping = "user_typing"
    static let userStopTyping = "user_stop_typing"
    static let notification = "notification"
}

protocol ChatSocketDelegate: AnyObject {
    func didReceiveNewMessage(_ message: ChatMessage, roomId: Int)
    func didReceiveReadReceipt(_ receipt: SocketReadReceipt)
    func didReceiveTyping(userId: Int, isTyping: Bool)
    func didReceiveNotification()
    func didConnect()
    func didDisconnect()
}

extension ChatSocketDelegate {
    func didReceiveReadReceipt(_ receipt: SocketReadReceipt) {}
    func didReceiveTyping(userId: Int, isTyping: Bool) {}
    func didReceiveNotification() {}
    func didConnect() {}
    func didDisconnect() {}
}

class ChatSocketManager {
    static let shared = ChatSocketManager()
    weak var delegate: ChatSocketDelegate?
    private(set) var currentRoomId: Int?
    private(set) var isConnected = false

    #if canImport(SocketIO)
    private var manager: SocketManager?
    private var socket: SocketIOClient?
    #endif

    func connect(token: String, baseURL: String) {
        #if canImport(SocketIO)
        guard let socketURL = URL(string: normalizedSocketBaseURL(baseURL)) else { return }
        manager = SocketManager(
            socketURL: socketURL,
            config: [
                .extraHeaders(["Authorization": "Bearer \(token)"]),
                .forceWebsockets(true),
                .reconnects(true),
                .reconnectWait(2),
                .compress
            ]
        )
        socket = manager?.defaultSocket
        setupHandlers()
        socket?.connect()
        #else
        isConnected = true
        delegate?.didConnect()
        #endif
    }

    func disconnect() {
        leaveCurrentRoom()
        #if canImport(SocketIO)
        socket?.disconnect()
        socket?.removeAllHandlers()
        socket = nil
        manager = nil
        #endif
        isConnected = false
        delegate?.didDisconnect()
    }

    func joinRoom(roomId: Int) {
        currentRoomId = roomId
        #if canImport(SocketIO)
        print("[NativeChat][Socket] join_room emit room_id=\(roomId)")
        socket?.emit(SocketEvent.joinRoom, ["room_id": roomId])
        #endif
    }

    func leaveCurrentRoom() {
        guard let roomId = currentRoomId else { return }
        #if canImport(SocketIO)
        socket?.emit(SocketEvent.leaveRoom, ["room_id": roomId])
        #endif
        currentRoomId = nil
    }

    func sendTypingStart() {
        guard let roomId = currentRoomId else { return }
        #if canImport(SocketIO)
        socket?.emit(SocketEvent.typingStart, ["room_id": roomId])
        #else
        _ = roomId
        #endif
    }

    func sendTypingStop() {
        guard let roomId = currentRoomId else { return }
        #if canImport(SocketIO)
        socket?.emit(SocketEvent.typingStop, ["room_id": roomId])
        #else
        _ = roomId
        #endif
    }

    private func setupHandlers() {
        #if canImport(SocketIO)
        socket?.removeAllHandlers()

        socket?.on(SocketEvent.newMessage) { [weak self] data, _ in
            guard
                let dict = data.first as? [String: Any],
                let json = try? JSONSerialization.data(withJSONObject: dict),
                let payload = try? JSONDecoder().decode(SocketNewMessage.self, from: json)
            else { return }
            print("[NativeChat][Socket] new_message received room_id=\(payload.roomId) message_id=\(payload.message.id)")
            self?.delegate?.didReceiveNewMessage(payload.message, roomId: payload.roomId)
        }

        socket?.on(SocketEvent.readReceipt) { [weak self] data, _ in
            guard
                let dict = data.first as? [String: Any],
                let json = try? JSONSerialization.data(withJSONObject: dict),
                let receipt = try? JSONDecoder().decode(SocketReadReceipt.self, from: json)
            else { return }
            self?.delegate?.didReceiveReadReceipt(receipt)
        }

        socket?.on(SocketEvent.userTyping) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any], let userId = dict["user_id"] as? Int else { return }
            self?.delegate?.didReceiveTyping(userId: userId, isTyping: true)
        }

        socket?.on(SocketEvent.userStopTyping) { [weak self] data, _ in
            guard let dict = data.first as? [String: Any], let userId = dict["user_id"] as? Int else { return }
            self?.delegate?.didReceiveTyping(userId: userId, isTyping: false)
        }

        socket?.on(SocketEvent.notification) { [weak self] _, _ in
            self?.delegate?.didReceiveNotification()
        }

        socket?.on(clientEvent: .connect) { [weak self] _, _ in
            guard let self else { return }
            self.isConnected = true
            print("[NativeChat][Socket] socket connected")
            self.delegate?.didConnect()
            if let roomId = self.currentRoomId {
                print("[NativeChat][Socket] join_room emit room_id=\(roomId) (on reconnect)")
                self.socket?.emit(SocketEvent.joinRoom, ["room_id": roomId])
            }
        }

        socket?.on(clientEvent: .disconnect) { [weak self] _, _ in
            self?.isConnected = false
            print("[NativeChat][Socket] socket disconnected")
            self?.delegate?.didDisconnect()
        }
        #endif
    }

    private func normalizedSocketBaseURL(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasSuffix("/api") {
            return String(trimmed.dropLast(4))
        }
        return trimmed
    }
}
