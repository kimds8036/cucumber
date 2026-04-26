import Foundation

struct ChatRoom: Codable, Identifiable {
    let id: Int
    let otherUserId: Int?
    let otherUserNickname: String?
    let otherUserProfileImage: String?
    let lastMessage: String?
    let lastMessageAt: String?
    let unreadCount: Int
    let roomType: String
    let isAnonymous: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case otherUserId = "other_user_id"
        case otherUserNickname = "other_user_nickname"
        case otherUserProfileImage = "other_user_profile_image"
        case lastMessage = "last_message"
        case lastMessageAt = "last_message_at"
        case unreadCount = "unread_count"
        case roomType = "room_type"
        case isAnonymous = "is_anonymous"
    }
}

struct ChatMessage: Codable, Identifiable {
    let id: String
    let roomId: Int
    let senderId: Int?
    let senderName: String?
    let content: String?
    let images: [String]
    let createdAt: String
    let time: String?
    let isMe: Bool
    let isReadByOther: Bool?
    let isReadByMe: Bool?
    let isDeleted: Bool
    let isSending: Bool
    let isFailed: Bool
    let status: String?
    let showProfile: Bool?
    let showTimestamp: Bool?
    let parentMessageId: Int?
    let parentContent: String?
    let parentSenderName: String?
    var type: String?
    var dateKey: String?

    enum CodingKeys: String, CodingKey {
        case id, content, images, time, status, showProfile, showTimestamp, type, dateKey
        case roomId = "room_id"
        case senderId = "sender_id"
        case senderName = "sender_name"
        case createdAt = "created_at"
        case isMe = "is_me"
        case isReadByOther
        case isReadByMe
        case isDeleted = "is_deleted"
        case isSending
        case isFailed
        case parentMessageId = "parent_message_id"
        case parentContent = "parent_content"
        case parentSenderName = "parent_sender_name"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let stringId = try? c.decode(String.self, forKey: .id) {
            id = stringId
        } else if let intId = try? c.decode(Int.self, forKey: .id) {
            id = String(intId)
        } else {
            id = UUID().uuidString
        }
        roomId = (try? c.decode(Int.self, forKey: .roomId)) ?? 0
        senderId = try? c.decode(Int.self, forKey: .senderId)
        senderName = try? c.decode(String.self, forKey: .senderName)
        content = try? c.decode(String.self, forKey: .content)
        images = (try? c.decode([String].self, forKey: .images)) ?? []
        createdAt = (try? c.decode(String.self, forKey: .createdAt)) ?? ""
        time = try? c.decode(String.self, forKey: .time)
        isMe = (try? c.decode(Bool.self, forKey: .isMe)) ?? false
        isReadByOther = try? c.decode(Bool.self, forKey: .isReadByOther)
        isReadByMe = try? c.decode(Bool.self, forKey: .isReadByMe)
        isDeleted = (try? c.decode(Bool.self, forKey: .isDeleted)) ?? false
        isSending = (try? c.decode(Bool.self, forKey: .isSending)) ?? false
        isFailed = (try? c.decode(Bool.self, forKey: .isFailed)) ?? false
        status = try? c.decode(String.self, forKey: .status)
        showProfile = try? c.decode(Bool.self, forKey: .showProfile)
        showTimestamp = try? c.decode(Bool.self, forKey: .showTimestamp)
        parentMessageId = try? c.decode(Int.self, forKey: .parentMessageId)
        parentContent = try? c.decode(String.self, forKey: .parentContent)
        parentSenderName = try? c.decode(String.self, forKey: .parentSenderName)
        type = try? c.decode(String.self, forKey: .type)
        dateKey = try? c.decode(String.self, forKey: .dateKey)
    }
}

struct PersonalMail: Codable, Identifiable {
    let id: Int
    let senderNickname: String?
    let recipientNickname: String?
    let lastMessage: String?
    let lastMessageAt: String?
    let unreadCount: Int
    let isAnonymous: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case senderNickname = "sender_nickname"
        case recipientNickname = "recipient_nickname"
        case lastMessage = "last_message"
        case lastMessageAt = "last_message_at"
        case unreadCount = "unread_count"
        case isAnonymous = "is_anonymous"
    }
}

struct PostCardData {
    let id: Int?
    let author: String
    let location: String
    let content: String
    let likes: Int
    let comments: Int
    let isLiked: Bool
    let thumbnail: String
}

struct SocketNewMessage: Codable {
    let roomId: Int
    let message: ChatMessage
    enum CodingKeys: String, CodingKey { case roomId = "room_id", message }
}

struct SocketReadReceipt: Codable {
    let roomId: Int
    let userId: Int
    enum CodingKeys: String, CodingKey { case roomId = "room_id", userId = "user_id" }
}

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let message: String?
}

struct RoomsResponse: Codable { let rooms: [ChatRoom] }

struct MessagesResponse: Codable {
    let messages: [ChatMessage]
    let hasMore: Bool
    enum CodingKeys: String, CodingKey { case messages, hasMore = "has_more" }

    init(messages: [ChatMessage], hasMore: Bool) {
        self.messages = messages
        self.hasMore = hasMore
    }
}

struct PostRoomResponse: Codable { let room: PostRoomData? }

struct PostRoomData: Codable {
    let postId: Int?
    let postContent: String?
    let postThumbnail: String?
    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case postContent = "post_content"
        case postThumbnail = "post_thumbnail"
    }
}

struct PostDetailResponse: Codable { let data: PostDetailData? }

struct PostDetailData: Codable {
    let likeCount: Int?
    let commentCount: Int?
    let isLiked: Bool?
    let thumbnail: String?
    enum CodingKeys: String, CodingKey {
        case likeCount = "like_count"
        case commentCount = "comment_count"
        case isLiked
        case thumbnail
    }
}
